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