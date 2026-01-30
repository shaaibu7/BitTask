;; SIP-090 Non-Fungible Token Contract
;; Implements the SIP-090 standard for NFTs on Stacks

;; Define the SIP-090 trait
(impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)

;; Error constants
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-ALREADY-EXISTS (err u409))
(define-constant ERR-INVALID-RECIPIENT (err u400))

;; Contract metadata
(define-data-var contract-owner principal tx-sender)
(define-data-var last-token-id uint u0)
(define-data-var token-name (string-ascii 32) "SIP090 NFT")
(define-data-var token-symbol (string-ascii 10) "SIP090")

;; Token storage maps
(define-map token-owners uint principal)
(define-map token-uris uint (string-ascii 256))
(define-map token-approvals uint principal)
(define-map owner-balances principal uint)

;; Contract metadata functions
(define-read-only (get-contract-name)
  (ok (var-get token-name))
)

(define-read-only (get-contract-symbol)
  (ok (var-get token-symbol))
)

(define-read-only (get-total-supply)
  (ok (var-get last-token-id))
)