;; Multi-Token Marketplace Contract
;; Enables trading of ERC1155-like tokens
;; Version 1.0

;; Constants
(define-constant ERR-UNAUTHORIZED (err u501))
(define-constant ERR-INVALID-PRICE (err u502))
(define-constant ERR-INVALID-AMOUNT (err u503))
(define-constant ERR-LISTING-NOT-FOUND (err u504))
(define-constant ERR-INSUFFICIENT-BALANCE (err u505))
(define-constant ERR-SELF-PURCHASE (err u506))
(define-constant ERR-LISTING-EXPIRED (err u507))
(define-constant ERR-INSUFFICIENT-PAYMENT (err u508))

;; Marketplace owner
(define-data-var marketplace-owner principal tx-sender)

;; Marketplace fee (in basis points, e.g., 250 = 2.5%)
(define-data-var marketplace-fee uint u250)

;; Listing counter
(define-data-var listing-counter uint u0)

;; Active listings
(define-map listings
    uint ;; listing-id
    {
        seller: principal,
        token-contract: principal,
        token-id: uint,
        amount: uint,
        price-per-token: uint,
        expires-at: uint,
        active: bool,
        created-at: uint
    }
)

;; User listings mapping
(define-map user-listings principal (list 100 uint))

;; Token contract listings
(define-map contract-listings principal (list 100 uint))

;; @desc Create a new token listing
;; @param token-contract: The token contract address
;; @param token-id: The token ID to sell
;; @param amount: Amount of tokens to sell
;; @param price-per-token: Price per token in STX
;; @param duration: Listing duration in blocks
;; @returns: The listing ID
(define-public (create-listing 
    (token-contract principal) 
    (token-id uint) 
    (amount uint) 
    (price-per-token uint) 
    (duration uint))
    (let ((listing-id (+ (var-get listing-counter) u1))
          (expires-at (+ stacks-block-height duration)))
        
        ;; Validate inputs
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (asserts! (> price-per-token u0) ERR-INVALID-PRICE)
        (asserts! (> duration u0) ERR-INVALID-PRICE)
        
        ;; TODO: Check seller has sufficient balance in token contract
        ;; This would require calling the token contract's balance function
        
        ;; Update counter
        (var-set listing-counter listing-id)
        
        ;; Create listing
        (map-set listings listing-id {
            seller: tx-sender,
            token-contract: token-contract,
            token-id: token-id,
            amount: amount,
            price-per-token: price-per-token,
            expires-at: expires-at,
            active: true,
            created-at: stacks-block-height
        })
        
        ;; Add to user listings
        (let ((current-listings (default-to (list) (map-get? user-listings tx-sender))))
            (map-set user-listings tx-sender 
                (unwrap-panic (as-max-len? (append current-listings listing-id) u100)))
        )
        
        ;; Add to contract listings
        (let ((current-contract-listings (default-to (list) (map-get? contract-listings token-contract))))
            (map-set contract-listings token-contract
                (unwrap-panic (as-max-len? (append current-contract-listings listing-id) u100)))
        )
        
        ;; Emit listing event
        (print {
            event: "listing-created",
            listing-id: listing-id,
            seller: tx-sender,
            token-contract: token-contract,
            token-id: token-id,
            amount: amount,
            price-per-token: price-per-token,
            expires-at: expires-at
        })
        
        (ok listing-id)
    )
)

;; @desc Purchase tokens from a listing
;; @param listing-id: The listing ID to purchase from
;; @param amount: Amount of tokens to purchase
;; @returns: Success response
(define-public (purchase-tokens (listing-id uint) (amount uint))
    (let ((listing (unwrap! (map-get? listings listing-id) ERR-LISTING-NOT-FOUND)))
        
        ;; Validate listing is active and not expired
        (asserts! (get active listing) ERR-LISTING-NOT-FOUND)
        (asserts! (< stacks-block-height (get expires-at listing)) ERR-LISTING-EXPIRED)
        
        ;; Validate purchase amount
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (asserts! (<= amount (get amount listing)) ERR-INVALID-AMOUNT)
        
        ;; Prevent self-purchase
        (asserts! (not (is-eq tx-sender (get seller listing))) ERR-SELF-PURCHASE)
        
        ;; Calculate total cost and marketplace fee
        (let ((total-cost (* amount (get price-per-token listing)))
              (fee-amount (/ (* total-cost (var-get marketplace-fee)) u10000))
              (seller-amount (- total-cost fee-amount)))
            
            ;; Transfer STX from buyer to seller
            (try! (stx-transfer? seller-amount tx-sender (get seller listing)))
            
            ;; Transfer marketplace fee to owner
            (try! (stx-transfer? fee-amount tx-sender (var-get marketplace-owner)))
            
            ;; TODO: Transfer tokens from seller to buyer
            ;; This would require calling the token contract's transfer function
            
            ;; Update listing amount
            (let ((remaining-amount (- (get amount listing) amount)))
                (if (is-eq remaining-amount u0)
                    ;; Deactivate listing if fully purchased
                    (map-set listings listing-id (merge listing {active: false, amount: u0}))
                    ;; Update remaining amount
                    (map-set listings listing-id (merge listing {amount: remaining-amount}))
                )
            )
            
            ;; Emit purchase event
            (print {
                event: "tokens-purchased",
                listing-id: listing-id,
                buyer: tx-sender,
                seller: (get seller listing),
                token-contract: (get token-contract listing),
                token-id: (get token-id listing),
                amount: amount,
                total-cost: total-cost,
                fee-amount: fee-amount
            })
            
            (ok true)
        )
    )
)

;; @desc Cancel a listing
;; @param listing-id: The listing ID to cancel
;; @returns: Success response
(define-public (cancel-listing (listing-id uint))
    (let ((listing (unwrap! (map-get? listings listing-id) ERR-LISTING-NOT-FOUND)))
        
        ;; Only seller can cancel
        (asserts! (is-eq tx-sender (get seller listing)) ERR-UNAUTHORIZED)
        
        ;; Deactivate listing
        (map-set listings listing-id (merge listing {active: false}))
        
        ;; Emit cancellation event
        (print {
            event: "listing-cancelled",
            listing-id: listing-id,
            seller: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Get listing information
;; @param listing-id: The listing ID to query
;; @returns: Listing information or none
(define-read-only (get-listing (listing-id uint))
    (map-get? listings listing-id)
)

;; @desc Get listings by user
;; @param user: The user address
;; @returns: List of listing IDs
(define-read-only (get-user-listings (user principal))
    (default-to (list) (map-get? user-listings user))
)

;; @desc Get listings for a token contract
;; @param token-contract: The token contract address
;; @returns: List of listing IDs
(define-read-only (get-contract-listings (token-contract principal))
    (default-to (list) (map-get? contract-listings token-contract))
)

;; @desc Get marketplace statistics
;; @returns: Marketplace statistics
(define-read-only (get-marketplace-stats)
    {
        owner: (var-get marketplace-owner),
        fee-basis-points: (var-get marketplace-fee),
        total-listings: (var-get listing-counter)
    }
)

;; @desc Update marketplace fee (owner only)
;; @param new-fee: New fee in basis points
;; @returns: Success response
(define-public (update-marketplace-fee (new-fee uint))
    (begin
        (asserts! (is-eq tx-sender (var-get marketplace-owner)) ERR-UNAUTHORIZED)
        (asserts! (<= new-fee u1000) ERR-INVALID-PRICE) ;; Max 10%
        
        (var-set marketplace-fee new-fee)
        
        (print {
            event: "fee-updated",
            new-fee: new-fee,
            updated-by: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Transfer marketplace ownership
;; @param new-owner: The new marketplace owner
;; @returns: Success response
(define-public (transfer-marketplace-ownership (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get marketplace-owner)) ERR-UNAUTHORIZED)
        
        (var-set marketplace-owner new-owner)
        
        (print {
            event: "marketplace-ownership-transferred",
            previous-owner: tx-sender,
            new-owner: new-owner
        })
        
        (ok true)
    )
)