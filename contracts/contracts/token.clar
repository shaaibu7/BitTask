;; BitToken (BTK) - ERC20-like Token Contract
;; A fungible token implementation following SIP-010 standard

;; Token metadata
(define-constant TOKEN-NAME "BitToken")
(define-constant TOKEN-SYMBOL "BTK")
(define-constant TOKEN-DECIMALS u6)
(define-constant TOTAL-SUPPLY u1000000000000) ;; 1 million tokens with 6 decimals

;; Error constants
(define-constant ERR-INSUFFICIENT-BALANCE (err u1))
(define-constant ERR-INSUFFICIENT-ALLOWANCE (err u2))
(define-constant ERR-UNAUTHORIZED (err u3))

;; Data variables
(define-data-var contract-owner principal tx-sender)

;; Data maps
(define-map balances principal uint)
(define-map allowances {owner: principal, spender: principal} uint)

;; Initialize contract with total supply to owner
(map-set balances tx-sender TOTAL-SUPPLY)

;; SIP-010 trait implementation
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq tx-sender sender) ERR-UNAUTHORIZED)
        (try! (ft-transfer? amount sender recipient))
        (print memo)
        (ok true)
    )
)