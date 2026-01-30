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
;; Transfer functionality

;; Transfer token (SIP-090 required function)
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (let ((owner (unwrap! (map-get? token-owners token-id) ERR-NOT-FOUND)))
    ;; Verify authorization
    (asserts! (or 
      (is-eq tx-sender sender)
      (is-eq tx-sender owner)
      (is-eq tx-sender (default-to sender (map-get? token-approvals token-id)))
    ) ERR-NOT-AUTHORIZED)
    
    ;; Verify sender is current owner
    (asserts! (is-eq sender owner) ERR-NOT-AUTHORIZED)
    
    ;; Update ownership
    (map-set token-owners token-id recipient)
    
    ;; Update balances
    (map-set owner-balances sender 
      (- (default-to u0 (map-get? owner-balances sender)) u1))
    (map-set owner-balances recipient 
      (+ (default-to u0 (map-get? owner-balances recipient)) u1))
    
    ;; Clear any existing approvals
    (map-delete token-approvals token-id)
    
    ;; Emit transfer event
    (print {
      type: "nft_transfer_event",
      token-id: token-id,
      sender: sender,
      recipient: recipient
    })
    
    (ok true)
  )
)

;; Helper function for safe transfers with validation
(define-private (transfer-helper (token-id uint) (sender principal) (recipient principal))
  (begin
    ;; Basic validation
    (asserts! (not (is-eq sender recipient)) ERR-INVALID-RECIPIENT)
    (asserts! (token-exists token-id) ERR-NOT-FOUND)
    
    ;; Call main transfer function
    (transfer token-id sender recipient)
  )
)
;; Approval system

;; Approve operator for specific token
(define-public (approve (spender principal) (token-id uint))
  (let ((owner (unwrap! (map-get? token-owners token-id) ERR-NOT-FOUND)))
    (asserts! (or (is-eq tx-sender owner) (is-eq tx-sender (var-get contract-owner))) ERR-NOT-AUTHORIZED)
    (map-set token-approvals token-id spender)
    
    ;; Emit approval event
    (print {
      type: "nft_approval_event",
      token-id: token-id,
      owner: owner,
      approved: spender
    })
    
    (ok true)
  )
)

;; Get approved operator for token
(define-read-only (get-approved (token-id uint))
  (ok (map-get? token-approvals token-id))
)

;; Revoke approval for specific token
(define-public (revoke-approval (token-id uint))
  (let ((owner (unwrap! (map-get? token-owners token-id) ERR-NOT-FOUND)))
    (asserts! (or (is-eq tx-sender owner) (is-eq tx-sender (var-get contract-owner))) ERR-NOT-AUTHORIZED)
    (map-delete token-approvals token-id)
    
    ;; Emit approval revocation event
    (print {
      type: "nft_approval_revoked_event",
      token-id: token-id,
      owner: owner
    })
    
    (ok true)
  )
)
;; Approval lifecycle management

;; Check if operator is approved for token
(define-read-only (is-approved-for (token-id uint) (operator principal))
  (let ((owner (map-get? token-owners token-id))
        (approved (map-get? token-approvals token-id)))
    (match owner
      owner-principal (or 
        (is-eq operator owner-principal)
        (is-eq (some operator) approved))
      false)
  )
)

;; Transfer from approved operator
(define-public (transfer-from (token-id uint) (sender principal) (recipient principal))
  (let ((owner (unwrap! (map-get? token-owners token-id) ERR-NOT-FOUND)))
    ;; Verify sender is owner
    (asserts! (is-eq sender owner) ERR-NOT-AUTHORIZED)
    
    ;; Verify caller is approved
    (asserts! (is-approved-for token-id tx-sender) ERR-NOT-AUTHORIZED)
    
    ;; Execute transfer
    (transfer token-id sender recipient)
  )
)

;; Batch approval revocation (for contract owner)
(define-public (revoke-all-approvals (token-ids (list 100 uint)))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (ok (map revoke-approval-helper token-ids))
  )
)

(define-private (revoke-approval-helper (token-id uint))
  (map-delete token-approvals token-id)
)
;; Additional utility functions

;; Get tokens owned by a principal
(define-read-only (get-tokens-owned (owner principal))
  (let ((balance (default-to u0 (map-get? owner-balances owner))))
    (ok (get-tokens-owned-helper owner u1 (var-get last-token-id) (list)))
  )
)

(define-private (get-tokens-owned-helper (owner principal) (current-id uint) (max-id uint) (acc (list 1000 uint)))
  (if (> current-id max-id)
    acc
    (let ((token-owner (map-get? token-owners current-id)))
      (if (is-eq (some owner) token-owner)
        (get-tokens-owned-helper owner (+ current-id u1) max-id (unwrap-panic (as-max-len? (append acc current-id) u1000)))
        (get-tokens-owned-helper owner (+ current-id u1) max-id acc)
      )
    )
  )
)

;; Check if token ID is valid (exists)
(define-read-only (is-valid-token-id (token-id uint))
  (and (> token-id u0) (<= token-id (var-get last-token-id)))
)

;; Get contract owner
(define-read-only (get-contract-owner)
  (ok (var-get contract-owner))
)

;; Transfer contract ownership (only current owner)
(define-public (transfer-ownership (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (var-set contract-owner new-owner)
    
    (print {
      type: "ownership_transfer_event",
      old-owner: tx-sender,
      new-owner: new-owner
    })
    
    (ok true)
  )
)

;; Batch mint function for efficiency
(define-public (batch-mint (recipients (list 100 principal)) (uris (list 100 (string-ascii 256))))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (len recipients) (len uris)) ERR-INVALID-RECIPIENT)
    (ok (map batch-mint-helper recipients uris))
  )
)

(define-private (batch-mint-helper (recipient principal) (uri (string-ascii 256)))
  (mint recipient uri)
)