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

;; SIP-090 required functions

;; Get the last token ID
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; Get token URI
(define-read-only (get-token-uri (token-id uint))
  (ok (map-get? token-uris token-id))
)

;; Get token owner
(define-read-only (get-owner (token-id uint))
  (ok (map-get? token-owners token-id))
)

;; Helper function to check if token exists
(define-read-only (token-exists (token-id uint))
  (is-some (map-get? token-owners token-id))
)

;; Get balance of owner
(define-read-only (get-balance (owner principal))
  (ok (default-to u0 (map-get? owner-balances owner)))
)
;; Minting functionality

;; Mint a new token
(define-public (mint (recipient principal) (token-uri (string-ascii 256)))
  (let ((token-id (+ (var-get last-token-id) u1)))
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (asserts! (is-none (map-get? token-owners token-id)) ERR-ALREADY-EXISTS)
    
    ;; Update token storage
    (map-set token-owners token-id recipient)
    (map-set token-uris token-id token-uri)
    
    ;; Update balances
    (map-set owner-balances recipient 
      (+ (default-to u0 (map-get? owner-balances recipient)) u1))
    
    ;; Update last token ID
    (var-set last-token-id token-id)
    
    ;; Emit transfer event (from none to recipient)
    (print {
      type: "nft_mint_event",
      token-id: token-id,
      sender: none,
      recipient: recipient
    })
    
    (ok token-id)
  )
)

;; Set token URI (only contract owner)
(define-public (set-token-uri (token-id uint) (uri (string-ascii 256)))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (asserts! (token-exists token-id) ERR-NOT-FOUND)
    (map-set token-uris token-id uri)
    (ok true)
  )
)