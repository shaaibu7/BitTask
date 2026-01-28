;; SIP-010 Compliant BitToken (BTK) Implementation
;; A fully compliant SIP-010 fungible token for the BitTask platform

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

;; SIP-010 trait implementation

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