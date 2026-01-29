;; SIP-010 Compliant BitToken (BTK) Implementation
;; A fully compliant SIP-010 fungible token for the BitTask platform
;; 
;; This contract implements all required SIP-010 functions:
;; - get-name, get-symbol, get-decimals, get-total-supply, get-balance
;; - transfer with memo support and proper authorization
;; - get-token-uri for metadata (optional SIP-010 function)
;;
;; Additional features:
;; - Allowance system (approve, get-allowance, transfer-from)
;; - Minting and burning capabilities with proper authorization
;; - Administrative functions for contract management
;; - Comprehensive error handling and event emission
;; - Gas-optimized using Clarity's built-in fungible token primitives

;; Import SIP-010 trait
(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; Token metadata constants
(define-constant TOKEN-NAME "BitToken")
(define-constant TOKEN-SYMBOL "BTK")
(define-constant TOKEN-DECIMALS u6)
(define-constant INITIAL-SUPPLY u1000000000000) ;; 1 million tokens with 6 decimals

;; Error constants
(define-constant ERR-OWNER-ONLY (err u100))
(define-constant ERR-NOT-TOKEN-OWNER (err u101))
(define-constant ERR-INSUFFICIENT-BALANCE (err u1))
(define-constant ERR-INSUFFICIENT-ALLOWANCE (err u2))
(define-constant ERR-INVALID-AMOUNT (err u103))
(define-constant ERR-INVALID-PRINCIPAL (err u104))

;; Data variables
(define-data-var contract-owner principal tx-sender)
(define-data-var token-uri (optional (string-utf8 256)) none)

;; Data maps
;; Allowances map for tracking spending permissions
(define-map allowances {owner: principal, spender: principal} uint)

;; Define the fungible token
(define-fungible-token bittoken)

;; Initialize contract with initial supply to owner
(ft-mint? bittoken INITIAL-SUPPLY tx-sender)

;; ============================================================================
;; SIP-010 TRAIT IMPLEMENTATION
;; ============================================================================

;; Get token name
(define-public (get-name)
    (ok TOKEN-NAME)
)
;; Get token symbol
(define-public (get-symbol)
    (ok TOKEN-SYMBOL)
)
;; Get token decimals
(define-public (get-decimals)
    (ok TOKEN-DECIMALS)
)
;; Get total supply
(define-public (get-total-supply)
    (ok (ft-get-supply bittoken))
)
;; Get balance for a principal
(define-public (get-balance (who principal))
    (ok (ft-get-balance bittoken who))
)
;; Transfer tokens
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        ;; Verify sender authorization
        (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER)
        
        ;; Check sufficient balance
        (asserts! (>= (ft-get-balance bittoken sender) amount) ERR-INSUFFICIENT-BALANCE)
        
        ;; Execute transfer using fungible token primitives
        (try! (ft-transfer? bittoken amount sender recipient))
        
        ;; Emit transfer event with memo
        (print {
            action: "transfer",
            sender: sender,
            recipient: recipient,
            amount: amount,
            memo: memo
        })
        
        (ok true)
    )
)

;; ============================================================================
;; EXTENDED FUNCTIONALITY
;; ============================================================================

;; Approve spender to spend tokens on behalf of owner
(define-public (approve (spender principal) (amount uint))
    (begin
        ;; Set allowance for spender
        (map-set allowances {owner: tx-sender, spender: spender} amount)
        
        ;; Emit approval event
        (print {
            action: "approve",
            owner: tx-sender,
            spender: spender,
            amount: amount
        })
        
        (ok true)
    )
)
;; Get allowance between owner and spender
(define-public (get-allowance (owner principal) (spender principal))
    (ok (default-to u0 (map-get? allowances {owner: owner, spender: spender})))
)
;; Transfer tokens from owner to recipient using allowance
(define-public (transfer-from (amount uint) (owner principal) (recipient principal) (memo (optional (buff 34))))
    (let ((allowance (default-to u0 (map-get? allowances {owner: owner, spender: tx-sender}))))
        ;; Check sufficient allowance
        (asserts! (>= allowance amount) ERR-INSUFFICIENT-ALLOWANCE)
        
        ;; Check sufficient balance
        (asserts! (>= (ft-get-balance bittoken owner) amount) ERR-INSUFFICIENT-BALANCE)
        
        ;; Execute transfer
        (try! (ft-transfer? bittoken amount owner recipient))
        
        ;; Update allowance
        (map-set allowances {owner: owner, spender: tx-sender} (- allowance amount))
        
        ;; Emit transfer event
        (print {
            action: "transfer-from",
            owner: owner,
            spender: tx-sender,
            recipient: recipient,
            amount: amount,
            memo: memo
        })
        
        (ok true)
    )
)

;; ============================================================================
;; ADMINISTRATIVE FUNCTIONS
;; ============================================================================

;; Mint new tokens (owner only)
(define-public (mint (amount uint) (recipient principal))
    (begin
        ;; Check owner authorization
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-OWNER-ONLY)
        
        ;; Validate amount is greater than zero
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        
        ;; Mint tokens to recipient
        (try! (ft-mint? bittoken amount recipient))
        
        ;; Emit mint event
        (print {
            action: "mint",
            recipient: recipient,
            amount: amount,
            total-supply: (ft-get-supply bittoken)
        })
        
        (ok true)
    )
)
;; Burn tokens from caller's balance
(define-public (burn (amount uint))
    (begin
        ;; Allow zero amount burns for consistency
        (if (is-eq amount u0)
            (begin
                ;; Emit burn event for zero amount
                (print {
                    action: "burn",
                    account: tx-sender,
                    amount: u0,
                    total-supply: (ft-get-supply bittoken)
                })
                (ok true)
            )
            (begin
                ;; Check sufficient balance for non-zero burns
                (asserts! (>= (ft-get-balance bittoken tx-sender) amount) ERR-INSUFFICIENT-BALANCE)
                
                ;; Burn tokens from caller
                (try! (ft-burn? bittoken amount tx-sender))
                
                ;; Emit burn event
                (print {
                    action: "burn",
                    account: tx-sender,
                    amount: amount,
                    total-supply: (ft-get-supply bittoken)
                })
                
                (ok true)
            )
        )
    )
)

;; Set new contract owner (current owner only)
(define-public (set-contract-owner (new-owner principal))
    (begin
        ;; Check current owner authorization
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-OWNER-ONLY)
        
        ;; Update contract owner
        (var-set contract-owner new-owner)
        
        ;; Emit ownership transfer event
        (print {
            action: "ownership-transfer",
            old-owner: tx-sender,
            new-owner: new-owner
        })
        
        (ok true)
    )
)

;; Get current contract owner
(define-read-only (get-contract-owner)
    (var-get contract-owner)
)
;; Get token URI (SIP-010 optional function)
(define-public (get-token-uri)
    (ok (var-get token-uri))
)

;; Set token URI (owner only)
(define-public (set-token-uri (new-uri (optional (string-utf8 256))))
    (begin
        ;; Check owner authorization
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-OWNER-ONLY)
        
        ;; Update token URI
        (var-set token-uri new-uri)
        
        ;; Emit URI update event
        (print {
            action: "uri-update",
            new-uri: new-uri
        })
        
        (ok true)
    )
)