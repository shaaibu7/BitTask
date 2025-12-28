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