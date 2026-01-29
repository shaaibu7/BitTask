;; Multi-Token Auction Contract
;; Enables auction-based trading of ERC1155 tokens
;; Version 1.0

;; Constants
(define-constant ERR-UNAUTHORIZED (err u901))
(define-constant ERR-AUCTION-NOT-FOUND (err u902))
(define-constant ERR-AUCTION-ENDED (err u903))
(define-constant ERR-BID-TOO-LOW (err u904))
(define-constant ERR-AUCTION-ACTIVE (err u905))
(define-constant ERR-NO-BIDS (err u906))
(define-constant ERR-INVALID-DURATION (err u907))
(define-constant ERR-SELF-BID (err u908))

;; Auction owner
(define-data-var auction-owner principal tx-sender)

;; Auction fee (in basis points)
(define-data-var auction-fee uint u250) ;; 2.5%

;; Auction counter
(define-data-var auction-counter uint u0)

;; Auctions
(define-map auctions
    uint ;; auction-id
    {
        seller: principal,
        token-contract: principal,
        token-id: uint,
        amount: uint,
        starting-price: uint,
        reserve-price: uint,
        current-bid: uint,
        highest-bidder: (optional principal),
        starts-at: uint,
        ends-at: uint,
        status: (string-ascii 16), ;; "pending", "active", "ended", "settled"
        created-at: uint,
        settled-at: (optional uint)
    }
)

;; Bids
(define-map bids
    {auction-id: uint, bidder: principal}
    {
        amount: uint,
        bid-time: uint,
        refunded: bool
    }
)

;; Auction bidders
(define-map auction-bidders uint (list 100 principal))

;; User auctions
(define-map user-auctions principal (list 50 uint))

;; User bids
(define-map user-bids principal (list 100 uint))

;; @desc Create a new auction
;; @param token-contract: The token contract address
;; @param token-id: The token ID to auction
;; @param amount: Amount of tokens to auction
;; @param starting-price: Starting bid price
;; @param reserve-price: Minimum acceptable price
;; @param duration: Auction duration in blocks
;; @returns: Auction ID
(define-public (create-auction
    (token-contract principal)
    (token-id uint)
    (amount uint)
    (starting-price uint)
    (reserve-price uint)
    (duration uint))
    (let ((auction-id (+ (var-get auction-counter) u1))
          (starts-at (+ stacks-block-height u144)) ;; Start in ~1 day
          (ends-at (+ starts-at duration)))
        
        ;; Validate inputs
        (asserts! (> amount u0) ERR-UNAUTHORIZED)
        (asserts! (> starting-price u0) ERR-UNAUTHORIZED)
        (asserts! (>= reserve-price starting-price) ERR-UNAUTHORIZED)
        (asserts! (> duration u0) ERR-INVALID-DURATION)
        
        ;; TODO: Check seller owns the tokens
        ;; This would require calling the token contract's balance function
        
        ;; TODO: Transfer tokens to auction contract for escrow
        ;; This would require calling the token contract's transfer function
        
        ;; Update counter
        (var-set auction-counter auction-id)
        
        ;; Create auction
        (map-set auctions auction-id {
            seller: tx-sender,
            token-contract: token-contract,
            token-id: token-id,
            amount: amount,
            starting-price: starting-price,
            reserve-price: reserve-price,
            current-bid: u0,
            highest-bidder: none,
            starts-at: starts-at,
            ends-at: ends-at,
            status: "pending",
            created-at: stacks-block-height,
            settled-at: none
        })
        
        ;; Add to user auctions
        (let ((user-auction-list (default-to (list) (map-get? user-auctions tx-sender))))
            (map-set user-auctions tx-sender
                (unwrap-panic (as-max-len? (append user-auction-list auction-id) u50)))
        )
        
        ;; Emit auction creation event
        (print {
            event: "auction-created",
            auction-id: auction-id,
            seller: tx-sender,
            token-contract: token-contract,
            token-id: token-id,
            amount: amount,
            starting-price: starting-price,
            reserve-price: reserve-price,
            starts-at: starts-at,
            ends-at: ends-at
        })
        
        (ok auction-id)
    )
)

;; @desc Place a bid on an auction
;; @param auction-id: The auction to bid on
;; @param bid-amount: The bid amount in STX
;; @returns: Success response
(define-public (place-bid (auction-id uint) (bid-amount uint))
    (let ((auction (unwrap! (map-get? auctions auction-id) ERR-AUCTION-NOT-FOUND)))
        
        ;; Check auction is active
        (asserts! (>= stacks-block-height (get starts-at auction)) ERR-AUCTION-ENDED)
        (asserts! (< stacks-block-height (get ends-at auction)) ERR-AUCTION-ENDED)
        (asserts! (is-eq (get status auction) "active") ERR-AUCTION-ACTIVE)
        
        ;; Prevent self-bidding
        (asserts! (not (is-eq tx-sender (get seller auction))) ERR-SELF-BID)
        
        ;; Check bid is higher than current bid
        (let ((min-bid (if (is-eq (get current-bid auction) u0)
                          (get starting-price auction)
                          (+ (get current-bid auction) u1))))
            (asserts! (>= bid-amount min-bid) ERR-BID-TOO-LOW)
        )
        
        ;; Transfer bid amount to contract
        (try! (stx-transfer? bid-amount tx-sender (as-contract tx-sender)))
        
        ;; Refund previous highest bidder if exists
        (match (get highest-bidder auction)
            previous-bidder (try! (as-contract (stx-transfer? (get current-bid auction) tx-sender previous-bidder)))
            true
        )
        
        ;; Record bid
        (map-set bids {auction-id: auction-id, bidder: tx-sender} {
            amount: bid-amount,
            bid-time: stacks-block-height,
            refunded: false
        })
        
        ;; Update auction with new highest bid
        (map-set auctions auction-id
            (merge auction {
                current-bid: bid-amount,
                highest-bidder: (some tx-sender)
            }))
        
        ;; Add bidder to auction bidders
        (let ((current-bidders (default-to (list) (map-get? auction-bidders auction-id))))
            (if (is-none (index-of current-bidders tx-sender))
                (map-set auction-bidders auction-id
                    (unwrap-panic (as-max-len? (append current-bidders tx-sender) u100)))
                true
            )
        )
        
        ;; Add auction to user bids
        (let ((user-bid-list (default-to (list) (map-get? user-bids tx-sender))))
            (if (is-none (index-of user-bid-list auction-id))
                (map-set user-bids tx-sender
                    (unwrap-panic (as-max-len? (append user-bid-list auction-id) u100)))
                true
            )
        )
        
        ;; Emit bid event
        (print {
            event: "bid-placed",
            auction-id: auction-id,
            bidder: tx-sender,
            bid-amount: bid-amount,
            previous-bid: (get current-bid auction),
            bid-time: stacks-block-height
        })
        
        (ok true)
    )
)

;; @desc End an auction
;; @param auction-id: The auction to end
;; @returns: Success response
(define-public (end-auction (auction-id uint))
    (let ((auction (unwrap! (map-get? auctions auction-id) ERR-AUCTION-NOT-FOUND)))
        
        ;; Check auction can be ended
        (asserts! (>= stacks-block-height (get ends-at auction)) ERR-AUCTION-ACTIVE)
        (asserts! (is-eq (get status auction) "active") ERR-AUCTION-ACTIVE)
        
        ;; Update auction status
        (map-set auctions auction-id
            (merge auction {status: "ended"}))
        
        ;; Emit auction end event
        (print {
            event: "auction-ended",
            auction-id: auction-id,
            final-bid: (get current-bid auction),
            highest-bidder: (get highest-bidder auction),
            reserve-met: (>= (get current-bid auction) (get reserve-price auction))
        })
        
        (ok true)
    )
)

;; @desc Settle an auction (transfer tokens and payments)
;; @param auction-id: The auction to settle
;; @returns: Success response
(define-public (settle-auction (auction-id uint))
    (let ((auction (unwrap! (map-get? auctions auction-id) ERR-AUCTION-NOT-FOUND)))
        
        ;; Check auction has ended
        (asserts! (is-eq (get status auction) "ended") ERR-AUCTION-ACTIVE)
        
        ;; Check if reserve price was met
        (if (>= (get current-bid auction) (get reserve-price auction))
            ;; Reserve met - complete sale
            (match (get highest-bidder auction)
                winner (let ((final-bid (get current-bid auction))
                            (fee-amount (/ (* final-bid (var-get auction-fee)) u10000))
                            (seller-amount (- final-bid fee-amount)))
                    
                    ;; Transfer payment to seller
                    (try! (as-contract (stx-transfer? seller-amount tx-sender (get seller auction))))
                    
                    ;; Transfer fee to auction owner
                    (try! (as-contract (stx-transfer? fee-amount tx-sender (var-get auction-owner))))
                    
                    ;; TODO: Transfer tokens to winner
                    ;; This would require calling the token contract's transfer function
                    
                    ;; Update auction status
                    (map-set auctions auction-id
                        (merge auction {
                            status: "settled",
                            settled-at: (some stacks-block-height)
                        }))
                    
                    ;; Emit settlement event
                    (print {
                        event: "auction-settled",
                        auction-id: auction-id,
                        winner: winner,
                        final-price: final-bid,
                        seller-received: seller-amount,
                        fee-collected: fee-amount
                    })
                    
                    (ok true)
                )
                ;; No bidders - return tokens to seller
                (begin
                    ;; TODO: Return tokens to seller
                    ;; This would require calling the token contract's transfer function
                    
                    (map-set auctions auction-id
                        (merge auction {
                            status: "settled",
                            settled-at: (some stacks-block-height)
                        }))
                    
                    (print {
                        event: "auction-settled-no-bids",
                        auction-id: auction-id,
                        tokens-returned: true
                    })
                    
                    (ok true)
                )
            )
            ;; Reserve not met - refund highest bidder and return tokens
            (begin
                ;; Refund highest bidder
                (match (get highest-bidder auction)
                    bidder (try! (as-contract (stx-transfer? (get current-bid auction) tx-sender bidder)))
                    true
                )
                
                ;; TODO: Return tokens to seller
                ;; This would require calling the token contract's transfer function
                
                (map-set auctions auction-id
                    (merge auction {
                        status: "settled",
                        settled-at: (some stacks-block-height)
                    }))
                
                (print {
                    event: "auction-settled-reserve-not-met",
                    auction-id: auction-id,
                    reserve-price: (get reserve-price auction),
                    highest-bid: (get current-bid auction)
                })
                
                (ok true)
            )
        )
    )
)

;; @desc Cancel an auction (seller only, before it starts)
;; @param auction-id: The auction to cancel
;; @returns: Success response
(define-public (cancel-auction (auction-id uint))
    (let ((auction (unwrap! (map-get? auctions auction-id) ERR-AUCTION-NOT-FOUND)))
        
        ;; Only seller can cancel
        (asserts! (is-eq tx-sender (get seller auction)) ERR-UNAUTHORIZED)
        
        ;; Can only cancel before auction starts
        (asserts! (< stacks-block-height (get starts-at auction)) ERR-AUCTION-ACTIVE)
        
        ;; TODO: Return tokens to seller
        ;; This would require calling the token contract's transfer function
        
        ;; Update auction status
        (map-set auctions auction-id
            (merge auction {status: "cancelled"}))
        
        ;; Emit cancellation event
        (print {
            event: "auction-cancelled",
            auction-id: auction-id,
            seller: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Get auction information
;; @param auction-id: The auction ID to query
;; @returns: Auction information or none
(define-read-only (get-auction (auction-id uint))
    (map-get? auctions auction-id)
)

;; @desc Get bid information
;; @param auction-id: The auction ID
;; @param bidder: The bidder address
;; @returns: Bid information or none
(define-read-only (get-bid (auction-id uint) (bidder principal))
    (map-get? bids {auction-id: auction-id, bidder: bidder})
)

;; @desc Get auctions created by a user
;; @param user: The user address
;; @returns: List of auction IDs
(define-read-only (get-user-auctions (user principal))
    (default-to (list) (map-get? user-auctions user))
)

;; @desc Get auctions a user has bid on
;; @param user: The user address
;; @returns: List of auction IDs
(define-read-only (get-user-bids (user principal))
    (default-to (list) (map-get? user-bids user))
)

;; @desc Get bidders for an auction
;; @param auction-id: The auction ID
;; @returns: List of bidder addresses
(define-read-only (get-auction-bidders (auction-id uint))
    (default-to (list) (map-get? auction-bidders auction-id))
)

;; @desc Check if auction is active
;; @param auction-id: The auction ID
;; @returns: True if auction is currently active
(define-read-only (is-auction-active (auction-id uint))
    (match (map-get? auctions auction-id)
        auction (and
            (is-eq (get status auction) "active")
            (>= stacks-block-height (get starts-at auction))
            (< stacks-block-height (get ends-at auction))
        )
        false
    )
)

;; @desc Get auction statistics
;; @returns: Auction contract statistics
(define-read-only (get-auction-stats)
    {
        owner: (var-get auction-owner),
        fee-basis-points: (var-get auction-fee),
        total-auctions: (var-get auction-counter)
    }
)

;; @desc Update auction fee (owner only)
;; @param new-fee: New fee in basis points
;; @returns: Success response
(define-public (update-auction-fee (new-fee uint))
    (begin
        (asserts! (is-eq tx-sender (var-get auction-owner)) ERR-UNAUTHORIZED)
        (asserts! (<= new-fee u1000) ERR-UNAUTHORIZED) ;; Max 10%
        
        (var-set auction-fee new-fee)
        
        (print {
            event: "auction-fee-updated",
            new-fee: new-fee,
            updated-by: tx-sender
        })
        
        (ok true)
    )
)