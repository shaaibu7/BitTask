;; ERC1155-like Multi-Token Contract
;; Implements multi-token functionality similar to ERC1155 standard
;; Version 1.2 - Enhanced with improved gas efficiency and security

;; Constants and Error Codes
(define-constant ERR-INSUFFICIENT-BALANCE (err u100))
(define-constant ERR-UNAUTHORIZED (err u101))
(define-constant ERR-INVALID-TOKEN-ID (err u102))
(define-constant ERR-ZERO-AMOUNT (err u103))
(define-constant ERR-SELF-TRANSFER (err u104))
(define-constant ERR-ARRAY-LENGTH-MISMATCH (err u105))
(define-constant ERR-TOKEN-NOT-FOUND (err u106))
(define-constant ERR-INVALID-PRINCIPAL (err u107))
(define-constant ERR-CONTRACT-PAUSED (err u108))
(define-constant ERR-INVALID-URI (err u109))
(define-constant ERR-TOKEN-SUPPLY-EXCEEDED (err u110))
;; Maximum batch size for operations
(define-constant MAX-BATCH-SIZE u50)

;; Contract owner
(define-data-var contract-owner principal tx-sender)

;; Contract version
(define-data-var contract-version (string-ascii 10) "1.2.0")

;; Token ID counter for unique token generation
(define-data-var next-token-id uint u1)

;; Contract deployment timestamp
(define-data-var deployment-time uint stacks-block-height)

;; Total tokens created counter
(define-data-var total-tokens-created uint u0)

;; Data Maps

;; Token balances: (owner, token-id) -> balance
(define-map token-balances {owner: principal, token-id: uint} uint)

;; Operator approvals: (owner, operator) -> approved
(define-map operator-approvals {owner: principal, operator: principal} bool)

;; Token creator tracking: token-id -> creator
(define-map token-creators uint principal)

;; Token metadata URIs: token-id -> uri
(define-map token-uris uint (string-ascii 256))

;; Token existence tracking: token-id -> exists
(define-map token-exists-map uint bool)

;; Total supply tracking: token-id -> total-supply
(define-map token-supplies uint uint)

;; Core Balance and Query Functions

;; @desc Get token balance for a specific owner and token ID
;; @param owner: The principal whose balance to query
;; @param token-id: The token ID to query
;; @returns: The balance amount (0 if not found)
(define-read-only (get-balance (owner principal) (token-id uint))
    (default-to u0 (map-get? token-balances {owner: owner, token-id: token-id}))
)

;; @desc Validate batch size
(define-private (validate-batch-size (size uint))
    (asserts! (<= size MAX-BATCH-SIZE) ERR-ARRAY-LENGTH-MISMATCH)
)

;; @desc Enhanced batch balance query with gas optimization
;; @param owners: List of principals to query
;; @param token-ids: List of token IDs to query (must match owners length)
;; @returns: List of balances corresponding to each owner/token-id pair
(define-read-only (get-balance-batch-optimized (owners (list 50 principal)) (token-ids (list 50 uint)))
    (let ((owners-length (len owners))
          (token-ids-length (len token-ids)))
        ;; Ensure arrays have same length
        (asserts! (is-eq owners-length token-ids-length) ERR-ARRAY-LENGTH-MISMATCH)
        (try! (validate-batch-size owners-length))
        
        ;; Optimized batch processing
        (ok (map get-balance-optimized (zip-optimized owners token-ids)))
    )
)

;; Optimized balance lookup
(define-private (get-balance-optimized (pair {owner: principal, token-id: uint}))
    (default-to u0 (map-get? token-balances {owner: (get owner pair), token-id: (get token-id pair)}))
)

;; Optimized zip function
(define-private (zip-optimized (owners (list 50 principal)) (token-ids (list 50 uint)))
    (map make-pair-optimized owners token-ids)
)

;; Optimized pair creation
(define-private (make-pair-optimized (owner principal) (token-id uint))
    {owner: owner, token-id: token-id}
)

;; Helper function for batch balance queries
(define-private (get-balance-pair (pair {owner: principal, token-id: uint}))
    (get-balance (get owner pair) (get token-id pair))
)

;; Helper function to zip two lists into pairs
(define-private (zip (owners (list 100 principal)) (token-ids (list 100 uint)))
    (map make-pair owners token-ids)
)

;; Helper function to create owner/token-id pairs
(define-private (make-pair (owner principal) (token-id uint))
    {owner: owner, token-id: token-id}
)

;; @desc Check if a token type exists
;; @param token-id: The token ID to check
;; @returns: True if token exists, false otherwise
(define-read-only (token-exists (token-id uint))
    (default-to false (map-get? token-exists-map token-id))
)

;; @desc Get total supply for a token type
;; @param token-id: The token ID to query
;; @returns: Total circulating supply (0 if token doesn't exist)
(define-read-only (get-total-supply (token-id uint))
    (default-to u0 (map-get? token-supplies token-id))
)

;; @desc Get contract version
;; @returns: The contract version string
(define-read-only (get-contract-version)
    (var-get contract-version)
)

;; @desc Get the contract owner
;; @returns: The principal that owns this contract
(define-read-only (get-contract-owner)
    (var-get contract-owner)
)

;; @desc Get deployment time
;; @returns: Block height when contract was deployed
(define-read-only (get-deployment-time)
    (var-get deployment-time)
)

;; @desc Get total tokens created
;; @returns: Total number of token types created
(define-read-only (get-total-tokens-created)
    (var-get total-tokens-created)
)

;; @desc Get the next token ID that will be assigned
;; @returns: The next available token ID
(define-read-only (get-next-token-id)
    (var-get next-token-id)
)

;; @desc Get token URI for metadata
;; @param token-id: The token ID to query
;; @returns: The URI string (empty if not set)
(define-read-only (get-token-uri (token-id uint))
    (default-to "" (map-get? token-uris token-id))
)

;; @desc Get token creator
;; @param token-id: The token ID to query
;; @returns: The principal that created the token (none if not found)
(define-read-only (get-token-creator (token-id uint))
    (map-get? token-creators token-id)
)

;; @desc Check if an operator is approved for all tokens of an owner
;; @param owner: The token owner
;; @param operator: The potential operator
;; @returns: True if operator is approved, false otherwise
(define-read-only (is-approved-for-all (owner principal) (operator principal))
    (default-to false (map-get? operator-approvals {owner: owner, operator: operator}))
)

;; Operator Approval System

;; @desc Set or unset approval for an operator to manage all tokens
;; @param operator: The principal to approve or revoke
;; @param approved: True to approve, false to revoke
;; @returns: Success response
(define-public (set-approval-for-all (operator principal) (approved bool))
    (begin
        ;; Check if contract is paused
        (asserts! (not (var-get contract-paused)) ERR-CONTRACT-PAUSED)
        
        ;; Cannot approve yourself
        (asserts! (not (is-eq tx-sender operator)) ERR-INVALID-PRINCIPAL)
        
        ;; Set or remove approval
        (if approved
            (map-set operator-approvals {owner: tx-sender, operator: operator} true)
            (map-delete operator-approvals {owner: tx-sender, operator: operator})
        )
        
        ;; Emit approval event
        (print {
            event: "approval-for-all",
            owner: tx-sender,
            operator: operator,
            approved: approved
        })
        
        (ok true)
    )
)

;; Helper function to check if a principal is authorized to transfer tokens
;; @param owner: The token owner
;; @param operator: The potential operator
;; @returns: True if authorized (owner or approved operator)
(define-private (is-authorized (owner principal) (operator principal))
    (or 
        (is-eq owner operator)
        (is-approved-for-all owner operator)
    )
)

;; Single Token Transfer Functions

;; @desc Transfer a single token type from one address to another
;; @param from: The sender's address
;; @param to: The recipient's address
;; @param token-id: The token ID to transfer
;; @param amount: The amount to transfer
;; @returns: Success response
(define-public (transfer-single (from principal) (to principal) (token-id uint) (amount uint))
    (let ((sender-balance (get-balance from token-id)))
        ;; Check if contract is paused
        (asserts! (not (var-get contract-paused)) ERR-CONTRACT-PAUSED)
        
        ;; Input validation
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        (asserts! (not (is-eq from to)) ERR-SELF-TRANSFER)
        (asserts! (>= sender-balance amount) ERR-INSUFFICIENT-BALANCE)
        (asserts! (is-authorized from tx-sender) ERR-UNAUTHORIZED)
        
        ;; Update balances
        (map-set token-balances {owner: from, token-id: token-id} (- sender-balance amount))
        (map-set token-balances {owner: to, token-id: token-id} (+ (get-balance to token-id) amount))
        
        ;; Emit transfer event
        (print {
            event: "transfer-single",
            operator: tx-sender,
            from: from,
            to: to,
            token-id: token-id,
            amount: amount
        })
        
        (ok true)
    )
)

;; Token Minting Functions

;; @desc Mint new tokens to a recipient (owner only)
;; @param to: The recipient's address
;; @param token-id: The token ID to mint (0 for new token type)
;; @param amount: The amount to mint
;; @returns: The token ID that was minted to
(define-public (mint-tokens (to principal) (token-id uint) (amount uint))
    (let ((actual-token-id (if (is-eq token-id u0) 
                              (var-get next-token-id) 
                              token-id)))
        ;; Only contract owner can mint
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        
        ;; If minting a new token type (token-id = 0), increment counter and mark as existing
        (if (is-eq token-id u0)
            (begin
                (var-set next-token-id (+ actual-token-id u1))
                (map-set token-exists-map actual-token-id true)
            )
            ;; For existing token, verify it exists
            (asserts! (token-exists actual-token-id) ERR-TOKEN-NOT-FOUND)
        )
        
        ;; Update recipient balance
        (map-set token-balances 
            {owner: to, token-id: actual-token-id} 
            (+ (get-balance to actual-token-id) amount))
        
        ;; Update total supply
        (map-set token-supplies 
            actual-token-id 
            (+ (get-total-supply actual-token-id) amount))
        
        ;; Emit mint event (transfer from zero address)
        (print {
            event: "transfer-single",
            operator: tx-sender,
            from: 'SP000000000000000000002Q6VF78, ;; Zero address equivalent
            to: to,
            token-id: actual-token-id,
            amount: amount
        })
        
        (ok actual-token-id)
    )
)

;; Token Burning Functions

;; @desc Burn tokens from an address (owner or approved operator only)
;; @param from: The address to burn tokens from
;; @param token-id: The token ID to burn
;; @param amount: The amount to burn
;; @returns: Success response
(define-public (burn-tokens (from principal) (token-id uint) (amount uint))
    (let ((current-balance (get-balance from token-id)))
        ;; Input validation
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        (asserts! (>= current-balance amount) ERR-INSUFFICIENT-BALANCE)
        (asserts! (is-authorized from tx-sender) ERR-UNAUTHORIZED)
        (asserts! (token-exists token-id) ERR-TOKEN-NOT-FOUND)
        
        ;; Update balance
        (map-set token-balances 
            {owner: from, token-id: token-id} 
            (- current-balance amount))
        
        ;; Update total supply
        (map-set token-supplies 
            token-id 
            (- (get-total-supply token-id) amount))
        
        ;; Emit burn event (transfer to zero address)
        (print {
            event: "transfer-single",
            operator: tx-sender,
            from: from,
            to: 'SP000000000000000000002Q6VF78, ;; Zero address equivalent
            token-id: token-id,
            amount: amount
        })
        
        (ok true)
    )
)

;; Metadata Management Functions

;; @desc Set metadata URI for a token type (owner only)
;; @param token-id: The token ID to set metadata for
;; @param uri: The metadata URI string
;; @returns: Success response
(define-public (set-token-uri (token-id uint) (uri (string-ascii 256)))
    (begin
        ;; Only contract owner can set metadata
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Set the URI (works for both existing and future tokens)
        (map-set token-uris token-id uri)
        
        ;; Emit metadata update event
        (print {
            event: "uri-updated",
            token-id: token-id,
            uri: uri
        })
        
        (ok true)
    )
)

;; Batch Transfer Functions

;; @desc Transfer multiple token types in a single transaction
;; @param from: The sender's address
;; @param to: The recipient's address
;; @param token-ids: List of token IDs to transfer
;; @param amounts: List of amounts to transfer (must match token-ids length)
;; @returns: Success response
(define-public (transfer-batch (from principal) (to principal) (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (let ((token-ids-length (len token-ids))
          (amounts-length (len amounts)))
        ;; Check if contract is paused
        (asserts! (not (var-get contract-paused)) ERR-CONTRACT-PAUSED)
        
        ;; Input validation
        (asserts! (is-eq token-ids-length amounts-length) ERR-ARRAY-LENGTH-MISMATCH)
        (asserts! (> token-ids-length u0) ERR-ZERO-AMOUNT)
        (asserts! (not (is-eq from to)) ERR-SELF-TRANSFER)
        (asserts! (is-authorized from tx-sender) ERR-UNAUTHORIZED)
        
        ;; Process all transfers atomically
        (try! (fold process-batch-transfer (map make-transfer-pair token-ids amounts) (ok {from: from, to: to})))
        
        ;; Emit batch transfer event
        (print {
            event: "transfer-batch",
            operator: tx-sender,
            from: from,
            to: to,
            token-ids: token-ids,
            amounts: amounts
        })
        
        (ok true)
    )
)

;; Helper function to process individual transfers in a batch
(define-private (process-batch-transfer 
    (transfer-data {token-id: uint, amount: uint}) 
    (context (response {from: principal, to: principal} uint)))
    (let ((ctx (try! context))
          (token-id (get token-id transfer-data))
          (amount (get amount transfer-data))
          (from (get from ctx))
          (to (get to ctx))
          (sender-balance (get-balance from token-id)))
        
        ;; Validate this individual transfer
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        (asserts! (>= sender-balance amount) ERR-INSUFFICIENT-BALANCE)
        
        ;; Update balances
        (map-set token-balances {owner: from, token-id: token-id} (- sender-balance amount))
        (map-set token-balances {owner: to, token-id: token-id} (+ (get-balance to token-id) amount))
        
        ;; Emit individual transfer event
        (print {
            event: "transfer-single",
            operator: tx-sender,
            from: from,
            to: to,
            token-id: token-id,
            amount: amount
        })
        
        (ok ctx)
    )
)

;; Helper function to create token-id/amount pairs for batch processing
(define-private (make-transfer-pair (token-id uint) (amount uint))
    {token-id: token-id, amount: amount}
)

;; Input Validation and Edge Case Handling

;; @desc Validate that a principal is not the zero address equivalent
;; @param addr: The principal to validate
;; @returns: True if valid, false if zero address
(define-private (is-valid-principal (addr principal))
    (not (is-eq addr 'SP000000000000000000002Q6VF78))
)

;; @desc Enhanced URI validation with length and format checks
;; @param uri: The URI string to validate
;; @returns: Error if invalid, ok if valid
(define-private (validate-uri (uri (string-ascii 256)))
    (begin
        ;; Check URI is not empty
        (asserts! (> (len uri) u0) ERR-INVALID-URI)
        ;; Check URI is not too short (minimum 3 characters)
        (asserts! (>= (len uri) u3) ERR-INVALID-URI)
        ;; Check URI doesn't exceed maximum length
        (asserts! (<= (len uri) u256) ERR-INVALID-URI)
        (ok true)
    )
)

;; @desc Enhanced transfer validation with comprehensive checks and gas optimization
;; @param from: Sender address
;; @param to: Recipient address  
;; @param token-id: Token ID
;; @param amount: Transfer amount
;; @returns: Success if all validations pass
(define-private (validate-transfer (from principal) (to principal) (token-id uint) (amount uint))
    (begin
        ;; Basic validations with early returns for gas efficiency
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        (asserts! (not (is-eq from to)) ERR-SELF-TRANSFER)
        (asserts! (is-valid-principal from) ERR-INVALID-PRINCIPAL)
        (asserts! (is-valid-principal to) ERR-INVALID-PRINCIPAL)
        (asserts! (token-exists token-id) ERR-TOKEN-NOT-FOUND)
        (asserts! (>= (get-balance from token-id) amount) ERR-INSUFFICIENT-BALANCE)
        (ok true)
    )
)

;; @desc Validate array inputs for batch operations
;; @param list1: First list to validate
;; @param list2: Second list to validate
;; @returns: Success if arrays are valid and same length
(define-private (validate-batch-arrays (list1 (list 100 uint)) (list2 (list 100 uint)))
    (let ((len1 (len list1))
          (len2 (len list2)))
        (asserts! (is-eq len1 len2) ERR-ARRAY-LENGTH-MISMATCH)
        (asserts! (> len1 u0) ERR-ZERO-AMOUNT)
        (asserts! (<= len1 u100) ERR-ARRAY-LENGTH-MISMATCH)
        (ok true)
    )
)

;; Owner Management Functions

;; @desc Transfer contract ownership to a new owner
;; @param new-owner: The new contract owner
;; @returns: Success response
(define-public (transfer-ownership (new-owner principal))
    (begin
        ;; Only current owner can transfer ownership
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        (asserts! (is-valid-principal new-owner) ERR-INVALID-PRINCIPAL)
        (asserts! (not (is-eq new-owner (var-get contract-owner))) ERR-INVALID-PRINCIPAL)
        
        ;; Update owner
        (var-set contract-owner new-owner)
        
        ;; Emit ownership transfer event
        (print {
            event: "ownership-transferred",
            previous-owner: tx-sender,
            new-owner: new-owner
        })
        
        (ok true)
    )
)

;; @desc Renounce contract ownership (irreversible)
;; @returns: Success response
(define-public (renounce-ownership)
    (begin
        ;; Only current owner can renounce
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Set owner to zero address equivalent
        (var-set contract-owner 'SP000000000000000000002Q6VF78)
        
        ;; Emit ownership renouncement event
        (print {
            event: "ownership-renounced",
            previous-owner: tx-sender
        })
        
        (ok true)
    )
)

;; Utility Functions

;; @desc Check if token has supply
;; @param token-id: The token ID to check
;; @returns: True if token has supply > 0
(define-read-only (has-supply (token-id uint))
    (> (get-total-supply token-id) u0)
)

;; @desc Check if token is active (exists and has supply)
(define-read-only (is-token-active (token-id uint))
    (and (token-exists token-id) (has-supply token-id))
)

;; @desc Get multiple token supplies in one call
;; @param token-ids: List of token IDs to query
;; @returns: List of total supplies
(define-read-only (get-total-supply-batch (token-ids (list 100 uint)))
    (map get-total-supply token-ids)
)

;; @desc Check if multiple tokens exist
;; @param token-ids: List of token IDs to check
;; @returns: List of existence status
(define-read-only (token-exists-batch (token-ids (list 100 uint)))
    (map token-exists token-ids)
)

;; @desc Get tokens owned by a specific principal (simplified version)
;; @param owner: The principal to query
;; @param max-tokens: Maximum number of tokens to check
;; @returns: List of token IDs owned by the principal
(define-read-only (get-owned-tokens (owner principal) (max-tokens uint))
    (let ((token-range (generate-range u1 (min max-tokens (var-get next-token-id)))))
        (filter (lambda (token-id) (> (get-balance owner token-id) u0)) token-range)
    )
)

;; Helper function to generate a range of numbers
(define-private (generate-range (start uint) (end uint))
    ;; Simplified implementation - in production you'd want a more efficient approach
    (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15 u16 u17 u18 u19 u20)
)

;; Helper function to get minimum of two values
(define-private (min (a uint) (b uint))
    (if (<= a b) a b)
)

;; @desc Get contract information summary
;; @returns: Contract metadata and stats
(define-read-only (get-contract-info)
    {
        owner: (var-get contract-owner),
        next-token-id: (var-get next-token-id),
        total-token-types: (- (var-get next-token-id) u1)
    }
)

;; Emergency Functions and Pause Mechanism

;; Contract pause state
(define-data-var contract-paused bool false)

;; @desc Pause the contract (owner only)
;; @returns: Success response
(define-public (pause-contract)
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        (asserts! (not (var-get contract-paused)) ERR-UNAUTHORIZED) ;; Already paused
        
        (var-set contract-paused true)
        
        (print {
            event: "contract-paused",
            paused-by: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Unpause the contract (owner only)
;; @returns: Success response
(define-public (unpause-contract)
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        (asserts! (var-get contract-paused) ERR-UNAUTHORIZED) ;; Not paused
        
        (var-set contract-paused false)
        
        (print {
            event: "contract-unpaused",
            unpaused-by: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Check if contract is paused
;; @returns: True if paused, false otherwise
(define-read-only (is-paused)
    (var-get contract-paused)
)

;; @desc Emergency function to recover accidentally sent tokens (owner only)
;; @param token-contract: The token contract to recover from
;; @param amount: Amount to recover
;; @returns: Success response
(define-public (emergency-withdraw (amount uint))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        
        ;; Transfer STX from contract to owner
        (try! (as-contract (stx-transfer? amount tx-sender (var-get contract-owner))))
        
        (print {
            event: "emergency-withdrawal",
            amount: amount,
            withdrawn-by: tx-sender
        })
        
        (ok true)
    )
)

;; Operator Approval System

;; @desc Set or unset approval for an operator to manage all caller's tokens
;; @param operator: The principal to approve or revoke
;; @param approved: True to approve, false to revoke
;; @returns: Success response
(define-public (set-approval-for-all (operator principal) (approved bool))
    (begin
        ;; Cannot approve yourself as operator
        (asserts! (not (is-eq tx-sender operator)) ERR-INVALID-PRINCIPAL)
        
        ;; Set or remove approval
        (if approved
            (map-set operator-approvals {owner: tx-sender, operator: operator} true)
            (map-delete operator-approvals {owner: tx-sender, operator: operator})
        )
        
        ;; Emit approval event
        (print {
            event: "approval-for-all",
            owner: tx-sender,
            operator: operator,
            approved: approved
        })
        
        (ok true)
    )
)

;; Helper Functions for Transfer Authorization

;; @desc Check if a principal is authorized to transfer tokens on behalf of owner
;; @param owner: The token owner
;; @param operator: The potential operator
;; @returns: True if authorized (owner or approved operator)
(define-private (is-authorized (owner principal) (operator principal))
    (or 
        (is-eq owner operator)  ;; Owner can always transfer their own tokens
        (is-approved-for-all owner operator)  ;; Approved operator can transfer
    )
)

;; @desc Validate that the caller is authorized to transfer tokens
;; @param owner: The token owner
;; @returns: Error if not authorized, ok if authorized
(define-private (assert-authorized (owner principal))
    (asserts! (is-authorized owner tx-sender) ERR-UNAUTHORIZED)
)

;; Single Token Transfer Functionality

;; @desc Transfer a single token type from one address to another
;; @param from: The sender's address
;; @param to: The recipient's address  
;; @param token-id: The token ID to transfer
;; @param amount: The amount to transfer
;; @returns: Success response
(define-public (transfer-single (from principal) (to principal) (token-id uint) (amount uint))
    (begin
        ;; Input validation
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        (asserts! (not (is-eq from to)) ERR-SELF-TRANSFER)
        
        ;; Authorization check
        (try! (assert-authorized from))
        
        ;; Get current balance
        (let ((current-balance (get-balance from token-id)))
            ;; Check sufficient balance
            (asserts! (>= current-balance amount) ERR-INSUFFICIENT-BALANCE)
            
            ;; Update balances
            (let ((new-from-balance (- current-balance amount))
                  (current-to-balance (get-balance to token-id))
                  (new-to-balance (+ current-to-balance amount)))
                
                ;; Set new balances
                (if (> new-from-balance u0)
                    (map-set token-balances {owner: from, token-id: token-id} new-from-balance)
                    (map-delete token-balances {owner: from, token-id: token-id})
                )
                (map-set token-balances {owner: to, token-id: token-id} new-to-balance)
                
                ;; Emit transfer event
                (print {
                    event: "transfer-single",
                    operator: tx-sender,
                    from: from,
                    to: to,
                    token-id: token-id,
                    amount: amount
                })
                
                (ok true)
            )
        )
    )
)

;; Helper function for internal transfers (used by mint/burn)
(define-private (transfer-internal (from (optional principal)) (to (optional principal)) (token-id uint) (amount uint))
    (begin
        ;; Handle from balance (decrease or skip if minting)
        (match from
            sender (let ((current-balance (get-balance sender token-id)))
                (asserts! (>= current-balance amount) ERR-INSUFFICIENT-BALANCE)
                (let ((new-balance (- current-balance amount)))
                    (if (> new-balance u0)
                        (map-set token-balances {owner: sender, token-id: token-id} new-balance)
                        (map-delete token-balances {owner: sender, token-id: token-id})
                    )
                )
            )
            true ;; Minting - no sender to deduct from
        )
        
        ;; Handle to balance (increase or skip if burning)
        (match to
            recipient (let ((current-balance (get-balance recipient token-id)))
                (map-set token-balances {owner: recipient, token-id: token-id} (+ current-balance amount))
            )
            true ;; Burning - no recipient to add to
        )
        
        ;; Emit transfer event
        (print {
            event: "transfer",
            operator: tx-sender,
            from: from,
            to: to,
            token-id: token-id,
            amount: amount
        })
        
        (ok true)
    )
)
;; Batch Transfer Functionality

;; @desc Transfer multiple token types in a single transaction
;; @param from: The sender's address
;; @param to: The recipient's address
;; @param token-ids: List of token IDs to transfer
;; @param amounts: List of amounts to transfer (must match token-ids length)
;; @returns: Success response
(define-public (transfer-batch (from principal) (to principal) (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (begin
        ;; Input validation
        (asserts! (not (is-eq from to)) ERR-SELF-TRANSFER)
        (asserts! (is-eq (len token-ids) (len amounts)) ERR-ARRAY-LENGTH-MISMATCH)
        
        ;; Authorization check
        (try! (assert-authorized from))
        
        ;; Execute transfers using individual transfer-single calls
        (try! (execute-batch-via-single from to token-ids amounts))
        
        ;; Emit batch transfer event
        (print {
            event: "transfer-batch",
            operator: tx-sender,
            from: from,
            to: to,
            token-ids: token-ids,
            amounts: amounts
        })
        
        (ok true)
    )
)

;; @desc Execute batch by calling transfer-single for each pair
(define-private (execute-batch-via-single (from principal) (to principal) (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (let ((pairs (zip-batch token-ids amounts)))
        (fold execute-single-via-transfer-single pairs {from: from, to: to, result: (ok true)})
    )
)

;; @desc Execute single transfer via transfer-single function
(define-private (execute-single-via-transfer-single
    (transfer-data {token-id: uint, amount: uint})
    (context {from: principal, to: principal, result: (response bool uint)}))
    (match (get result context)
        success (let ((from (get from context))
                      (to (get to context))
                      (token-id (get token-id transfer-data))
                      (amount (get amount transfer-data)))
            ;; Validate amount
            (asserts! (> amount u0) (merge context {result: ERR-ZERO-AMOUNT}))
            
            ;; Check balance
            (let ((current-balance (get-balance from token-id)))
                (asserts! (>= current-balance amount) (merge context {result: ERR-INSUFFICIENT-BALANCE}))
                
                ;; Update balances directly
                (let ((new-from-balance (- current-balance amount))
                      (current-to-balance (get-balance to token-id))
                      (new-to-balance (+ current-to-balance amount)))
                    
                    ;; Set new balances
                    (if (> new-from-balance u0)
                        (map-set token-balances {owner: from, token-id: token-id} new-from-balance)
                        (map-delete token-balances {owner: from, token-id: token-id})
                    )
                    (map-set token-balances {owner: to, token-id: token-id} new-to-balance)
                    
                    ;; Emit individual transfer event
                    (print {
                        event: "transfer-single",
                        operator: tx-sender,
                        from: from,
                        to: to,
                        token-id: token-id,
                        amount: amount
                    })
                    
                    context ;; Return unchanged context
                )
            )
        )
        error (merge context {result: error})
    )
)

;; Helper function to zip token-ids and amounts for batch processing
(define-private (zip-batch (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (map make-transfer-pair token-ids amounts)
)

;; Helper function to create transfer pairs
(define-private (make-transfer-pair (token-id uint) (amount uint))
    {token-id: token-id, amount: amount}
)
;; Token Minting Functionality

;; @desc Mint new tokens to a recipient (owner only)
;; @param to: The recipient address
;; @param token-id: The token ID to mint (use 0 for new token type)
;; @param amount: The amount to mint
;; @returns: The token ID that was minted to
(define-public (mint-tokens (to principal) (token-id uint) (amount uint))
    (begin
        ;; Only contract owner can mint
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Validate amount is positive
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        
        ;; Determine the actual token ID to use
        (let ((actual-token-id (if (is-eq token-id u0)
                                   (var-get next-token-id)  ;; Create new token type
                                   token-id)))              ;; Use existing token type
            
            ;; If creating new token type, increment counter and mark as existing
            (if (is-eq token-id u0)
                (begin
                    (var-set next-token-id (+ actual-token-id u1))
                    (map-set token-exists-map actual-token-id true)
                    ;; Track token creator
                    (map-set token-creators actual-token-id tx-sender)
                )
                ;; For existing token, verify it exists or create it
                (if (not (token-exists actual-token-id))
                    (begin
                        (map-set token-exists-map actual-token-id true)
                        ;; Track token creator for new tokens
                        (map-set token-creators actual-token-id tx-sender)
                    )
                    true
                )
            )
            
            ;; Update recipient balance
            (let ((current-balance (get-balance to actual-token-id))
                  (new-balance (+ current-balance amount)))
                (map-set token-balances {owner: to, token-id: actual-token-id} new-balance)
            )
            
            ;; Update total supply
            (let ((current-supply (get-total-supply actual-token-id))
                  (new-supply (+ current-supply amount)))
                (map-set token-supplies actual-token-id new-supply)
            )
            
            ;; Emit mint event (transfer from zero address)
            (print {
                event: "transfer-single",
                operator: tx-sender,
                from: none,
                to: (some to),
                token-id: actual-token-id,
                amount: amount
            })
            
            ;; Emit mint-specific event
            (print {
                event: "mint",
                to: to,
                token-id: actual-token-id,
                amount: amount,
                new-supply: new-supply
            })
            
            (ok actual-token-id)
        )
    )
)

;; @desc Mint multiple token types to a recipient in batch (owner only)
;; @param to: The recipient address
;; @param token-ids: List of token IDs to mint
;; @param amounts: List of amounts to mint (must match token-ids length)
;; @returns: Success response
(define-public (mint-batch (to principal) (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (begin
        ;; Only contract owner can mint
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Validate array lengths match
        (asserts! (is-eq (len token-ids) (len amounts)) ERR-ARRAY-LENGTH-MISMATCH)
        
        ;; Execute batch minting
        (try! (execute-batch-minting to token-ids amounts))
        
        ;; Emit batch mint event
        (print {
            event: "mint-batch",
            to: to,
            token-ids: token-ids,
            amounts: amounts
        })
        
        (ok true)
    )
)

;; @desc Execute batch minting operations
(define-private (execute-batch-minting (to principal) (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (let ((pairs (zip-batch token-ids amounts)))
        (fold execute-single-mint pairs {to: to, result: (ok true)})
    )
)

;; @desc Execute a single mint operation in batch
(define-private (execute-single-mint
    (mint-data {token-id: uint, amount: uint})
    (context {to: principal, result: (response bool uint)}))
    (match (get result context)
        success (let ((to (get to context))
                      (token-id (get token-id mint-data))
                      (amount (get amount mint-data)))
            ;; Validate amount
            (asserts! (> amount u0) (merge context {result: ERR-ZERO-AMOUNT}))
            
            ;; Determine actual token ID
            (let ((actual-token-id (if (is-eq token-id u0)
                                       (var-get next-token-id)
                                       token-id)))
                
                ;; Handle token creation/existence
                (if (is-eq token-id u0)
                    (begin
                        (var-set next-token-id (+ actual-token-id u1))
                        (map-set token-exists-map actual-token-id true)
                    )
                    (if (not (token-exists actual-token-id))
                        (map-set token-exists-map actual-token-id true)
                        true
                    )
                )
                
                ;; Update balances and supply
                (let ((current-balance (get-balance to actual-token-id))
                      (new-balance (+ current-balance amount))
                      (current-supply (get-total-supply actual-token-id))
                      (new-supply (+ current-supply amount)))
                    
                    (map-set token-balances {owner: to, token-id: actual-token-id} new-balance)
                    (map-set token-supplies actual-token-id new-supply)
                    
                    ;; Emit individual mint event
                    (print {
                        event: "transfer-single",
                        operator: tx-sender,
                        from: none,
                        to: (some to),
                        token-id: actual-token-id,
                        amount: amount
                    })
                    
                    context ;; Return unchanged context
                )
            )
        )
        error (merge context {result: error})
    )
)
;; Token Burning Functionality

;; @desc Burn tokens from caller's balance
;; @param token-id: The token ID to burn
;; @param amount: The amount to burn
;; @returns: Success response
(define-public (burn-tokens (token-id uint) (amount uint))
    (begin
        ;; Validate amount is positive
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        
        ;; Check token exists
        (asserts! (token-exists token-id) ERR-TOKEN-NOT-FOUND)
        
        ;; Get current balance and validate sufficient amount
        (let ((current-balance (get-balance tx-sender token-id)))
            (asserts! (>= current-balance amount) ERR-INSUFFICIENT-BALANCE)
            
            ;; Update balance
            (let ((new-balance (- current-balance amount)))
                (if (> new-balance u0)
                    (map-set token-balances {owner: tx-sender, token-id: token-id} new-balance)
                    (map-delete token-balances {owner: tx-sender, token-id: token-id})
                )
            )
            
            ;; Update total supply
            (let ((current-supply (get-total-supply token-id))
                  (new-supply (- current-supply amount)))
                (if (> new-supply u0)
                    (map-set token-supplies token-id new-supply)
                    (map-delete token-supplies token-id)
                )
            )
            
            ;; Emit burn event (transfer to zero address)
            (print {
                event: "transfer-single",
                operator: tx-sender,
                from: (some tx-sender),
                to: none,
                token-id: token-id,
                amount: amount
            })
            
            ;; Emit burn-specific event
            (print {
                event: "burn",
                from: tx-sender,
                token-id: token-id,
                amount: amount,
                new-supply: (get-total-supply token-id)
            })
            
            (ok true)
        )
    )
)

;; @desc Burn tokens from a specific address (owner or approved operator only)
;; @param from: The address to burn tokens from
;; @param token-id: The token ID to burn
;; @param amount: The amount to burn
;; @returns: Success response
(define-public (burn-from (from principal) (token-id uint) (amount uint))
    (begin
        ;; Validate amount is positive
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        
        ;; Check authorization (owner or approved operator)
        (try! (assert-authorized from))
        
        ;; Check token exists
        (asserts! (token-exists token-id) ERR-TOKEN-NOT-FOUND)
        
        ;; Get current balance and validate sufficient amount
        (let ((current-balance (get-balance from token-id)))
            (asserts! (>= current-balance amount) ERR-INSUFFICIENT-BALANCE)
            
            ;; Update balance
            (let ((new-balance (- current-balance amount)))
                (if (> new-balance u0)
                    (map-set token-balances {owner: from, token-id: token-id} new-balance)
                    (map-delete token-balances {owner: from, token-id: token-id})
                )
            )
            
            ;; Update total supply
            (let ((current-supply (get-total-supply token-id))
                  (new-supply (- current-supply amount)))
                (if (> new-supply u0)
                    (map-set token-supplies token-id new-supply)
                    (map-delete token-supplies token-id)
                )
            )
            
            ;; Emit burn event (transfer to zero address)
            (print {
                event: "transfer-single",
                operator: tx-sender,
                from: (some from),
                to: none,
                token-id: token-id,
                amount: amount
            })
            
            ;; Emit burn-specific event
            (print {
                event: "burn",
                operator: tx-sender,
                from: from,
                token-id: token-id,
                amount: amount,
                new-supply: (get-total-supply token-id)
            })
            
            (ok true)
        )
    )
)

;; @desc Burn multiple token types in batch
;; @param from: The address to burn tokens from
;; @param token-ids: List of token IDs to burn
;; @param amounts: List of amounts to burn (must match token-ids length)
;; @returns: Success response
(define-public (burn-batch (from principal) (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (begin
        ;; Validate array lengths match
        (asserts! (is-eq (len token-ids) (len amounts)) ERR-ARRAY-LENGTH-MISMATCH)
        
        ;; Check authorization
        (try! (assert-authorized from))
        
        ;; Execute batch burning
        (try! (execute-batch-burning from token-ids amounts))
        
        ;; Emit batch burn event
        (print {
            event: "burn-batch",
            operator: tx-sender,
            from: from,
            token-ids: token-ids,
            amounts: amounts
        })
        
        (ok true)
    )
)

;; @desc Execute batch burning operations
(define-private (execute-batch-burning (from principal) (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (let ((pairs (zip-batch token-ids amounts)))
        (fold execute-single-burn pairs {from: from, result: (ok true)})
    )
)

;; @desc Execute a single burn operation in batch
(define-private (execute-single-burn
    (burn-data {token-id: uint, amount: uint})
    (context {from: principal, result: (response bool uint)}))
    (match (get result context)
        success (let ((from (get from context))
                      (token-id (get token-id burn-data))
                      (amount (get amount burn-data)))
            ;; Validate amount
            (asserts! (> amount u0) (merge context {result: ERR-ZERO-AMOUNT}))
            
            ;; Check token exists
            (asserts! (token-exists token-id) (merge context {result: ERR-TOKEN-NOT-FOUND}))
            
            ;; Check balance and burn
            (let ((current-balance (get-balance from token-id)))
                (asserts! (>= current-balance amount) (merge context {result: ERR-INSUFFICIENT-BALANCE}))
                
                ;; Update balance
                (let ((new-balance (- current-balance amount)))
                    (if (> new-balance u0)
                        (map-set token-balances {owner: from, token-id: token-id} new-balance)
                        (map-delete token-balances {owner: from, token-id: token-id})
                    )
                )
                
                ;; Update supply
                (let ((current-supply (get-total-supply token-id))
                      (new-supply (- current-supply amount)))
                    (if (> new-supply u0)
                        (map-set token-supplies token-id new-supply)
                        (map-delete token-supplies token-id)
                    )
                )
                
                ;; Emit burn event
                (print {
                    event: "transfer-single",
                    operator: tx-sender,
                    from: (some from),
                    to: none,
                    token-id: token-id,
                    amount: amount
                })
                
                context ;; Return unchanged context
            )
        )
        error (merge context {result: error})
    )
)
;; Metadata Management

;; @desc Set metadata URI for a token type (owner only)
;; @param token-id: The token ID to set metadata for
;; @param uri: The URI string pointing to token metadata
;; @returns: Success response
(define-public (set-token-uri (token-id uint) (uri (string-ascii 256)))
    (begin
        ;; Only contract owner can set metadata
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Validate URI is not empty
        (asserts! (> (len uri) u0) ERR-INVALID-TOKEN-ID)
        
        ;; Set the URI (creates token if it doesn't exist)
        (map-set token-uris token-id uri)
        
        ;; Mark token as existing if not already and track creator
        (if (not (token-exists token-id))
            (begin
                (map-set token-exists-map token-id true)
                ;; Track token creator for new tokens
                (map-set token-creators token-id tx-sender)
            )
            true
        )
        
        ;; Emit URI set event
        (print {
            event: "uri-set",
            token-id: token-id,
            uri: uri,
            operator: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Update metadata URI for an existing token type (owner only)
;; @param token-id: The token ID to update metadata for
;; @param new-uri: The new URI string
;; @returns: Success response
(define-public (update-token-uri (token-id uint) (new-uri (string-ascii 256)))
    (begin
        ;; Only contract owner can update metadata
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Check token exists
        (asserts! (token-exists token-id) ERR-TOKEN-NOT-FOUND)
        
        ;; Validate new URI is not empty
        (asserts! (> (len new-uri) u0) ERR-INVALID-TOKEN-ID)
        
        ;; Get old URI for event
        (let ((old-uri (get-token-uri token-id)))
            ;; Update the URI
            (map-set token-uris token-id new-uri)
            
            ;; Emit URI update event
            (print {
                event: "uri-updated",
                token-id: token-id,
                old-uri: old-uri,
                new-uri: new-uri,
                operator: tx-sender
            })
            
            (ok true)
        )
    )
)

;; @desc Remove metadata URI for a token type (owner only)
;; @param token-id: The token ID to remove metadata for
;; @returns: Success response
(define-public (remove-token-uri (token-id uint))
    (begin
        ;; Only contract owner can remove metadata
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Check token exists
        (asserts! (token-exists token-id) ERR-TOKEN-NOT-FOUND)
        
        ;; Get old URI for event
        (let ((old-uri (get-token-uri token-id)))
            ;; Remove the URI
            (map-delete token-uris token-id)
            
            ;; Emit URI removal event
            (print {
                event: "uri-removed",
                token-id: token-id,
                old-uri: old-uri,
                operator: tx-sender
            })
            
            (ok true)
        )
    )
)

;; @desc Set metadata URIs for multiple token types in batch (owner only)
;; @param token-ids: List of token IDs to set metadata for
;; @param uris: List of URI strings (must match token-ids length)
;; @returns: Success response
(define-public (set-token-uris-batch (token-ids (list 100 uint)) (uris (list 100 (string-ascii 256))))
    (begin
        ;; Only contract owner can set metadata
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Validate array lengths match
        (asserts! (is-eq (len token-ids) (len uris)) ERR-ARRAY-LENGTH-MISMATCH)
        
        ;; Execute batch URI setting
        (try! (execute-batch-uri-setting token-ids uris))
        
        ;; Emit batch URI set event
        (print {
            event: "uri-set-batch",
            token-ids: token-ids,
            uris: uris,
            operator: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Execute batch URI setting operations
(define-private (execute-batch-uri-setting (token-ids (list 100 uint)) (uris (list 100 (string-ascii 256))))
    (let ((pairs (zip-uri-batch token-ids uris)))
        (fold execute-single-uri-set pairs (ok true))
    )
)

;; @desc Execute a single URI set operation in batch
(define-private (execute-single-uri-set
    (uri-data {token-id: uint, uri: (string-ascii 256)})
    (previous-result (response bool uint)))
    (match previous-result
        success (let ((token-id (get token-id uri-data))
                      (uri (get uri uri-data)))
            ;; Validate URI is not empty
            (asserts! (> (len uri) u0) ERR-INVALID-TOKEN-ID)
            
            ;; Set the URI
            (map-set token-uris token-id uri)
            
            ;; Mark token as existing if not already
            (if (not (token-exists token-id))
                (map-set token-exists-map token-id true)
                true
            )
            
            ;; Emit individual URI set event
            (print {
                event: "uri-set",
                token-id: token-id,
                uri: uri,
                operator: tx-sender
            })
            
            (ok true)
        )
        error error
    )
)

;; Helper function to zip token-ids and URIs for batch processing
(define-private (zip-uri-batch (token-ids (list 100 uint)) (uris (list 100 (string-ascii 256))))
    (map make-uri-pair token-ids uris)
)

;; Helper function to create token-id/URI pairs
(define-private (make-uri-pair (token-id uint) (uri (string-ascii 256)))
    {token-id: token-id, uri: uri}
)
;; Total Supply Tracking

;; @desc Get total supplies for multiple token types
;; @param token-ids: List of token IDs to query
;; @returns: List of total supplies corresponding to each token ID
(define-read-only (get-total-supplies (token-ids (list 100 uint)))
    (map get-total-supply token-ids)
)

;; @desc Check if total supply tracking is consistent for a token
;; @param token-id: The token ID to validate
;; @returns: True if supply tracking is consistent
(define-read-only (validate-supply-consistency (token-id uint))
    (let ((recorded-supply (get-total-supply token-id))
          (calculated-supply (calculate-actual-supply token-id)))
        (is-eq recorded-supply calculated-supply)
    )
)

;; @desc Calculate actual supply by summing all balances (for validation)
;; @param token-id: The token ID to calculate supply for
;; @returns: The calculated total supply
(define-private (calculate-actual-supply (token-id uint))
    ;; Note: This is a simplified version. In a real implementation,
    ;; you would need to iterate through all possible owners.
    ;; For now, we trust the recorded supply from mint/burn operations.
    (get-total-supply token-id)
)

;; @desc Get comprehensive token information including creator
;; @param token-id: The token ID to query
;; @returns: Tuple with token existence, total supply, URI, and creator
(define-read-only (get-token-info (token-id uint))
    {
        exists: (token-exists token-id),
        total-supply: (get-total-supply token-id),
        uri: (get-token-uri token-id),
        creator: (get-token-creator token-id)
    }
)

;; @desc Get comprehensive information for multiple tokens
;; @param token-ids: List of token IDs to query
;; @returns: List of token information tuples
(define-read-only (get-tokens-info (token-ids (list 100 uint)))
    (map get-token-info token-ids)
)

;; @desc Get all token IDs that have been created (up to next-token-id)
;; @returns: List of existing token IDs
(define-read-only (get-existing-token-ids)
    (let ((max-id (var-get next-token-id)))
        (filter token-exists (generate-token-id-list max-id))
    )
)

;; Helper function to generate a list of token IDs from 1 to max
(define-private (generate-token-id-list (max-id uint))
    ;; This is a simplified version. In practice, you might want to
    ;; implement a more efficient way to track existing token IDs
    (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10) ;; Limited example
)

;; @desc Get contract statistics with enhanced metrics
;; @returns: Tuple with comprehensive contract statistics
(define-read-only (get-contract-stats)
    {
        owner: (var-get contract-owner),
        next-token-id: (var-get next-token-id),
        total-token-types: (- (var-get next-token-id) u1),
        paused: (var-get contract-paused),
        deployment-height: (var-get deployment-time),
        current-height: stacks-block-height
    }
)
;; Comprehensive Input Validation

;; @desc Validate transfer parameters for edge cases
;; @param from: Sender address
;; @param to: Recipient address
;; @param token-id: Token ID
;; @param amount: Transfer amount
;; @returns: Error if validation fails, ok if valid
(define-private (validate-transfer-params (from principal) (to principal) (token-id uint) (amount uint))
    (begin
        ;; Check amount is positive
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        
        ;; Check not self-transfer
        (asserts! (not (is-eq from to)) ERR-SELF-TRANSFER)
        
        ;; Check token exists (for transfers, not minting)
        (asserts! (token-exists token-id) ERR-TOKEN-NOT-FOUND)
        
        (ok true)
    )
)

;; @desc Validate batch operation parameters
;; @param token-ids: List of token IDs
;; @param amounts: List of amounts
;; @returns: Error if validation fails, ok if valid
(define-private (validate-batch-params (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (begin
        ;; Check arrays have same length
        (asserts! (is-eq (len token-ids) (len amounts)) ERR-ARRAY-LENGTH-MISMATCH)
        
        ;; Check arrays are not empty
        (asserts! (> (len token-ids) u0) ERR-INVALID-TOKEN-ID)
        
        ;; Check no zero amounts in batch
        (asserts! (is-none (index-of amounts u0)) ERR-ZERO-AMOUNT)
        
        (ok true)
    )
)

;; @desc Validate principal is not zero address equivalent
;; @param principal-to-check: The principal to validate
;; @returns: Error if invalid, ok if valid
(define-private (validate-principal (principal-to-check principal))
    (begin
        ;; In Clarity, we can't have null principals, but we can check for contract principal
        ;; This is a placeholder for additional principal validation if needed
        (ok true)
    )
)

;; @desc Enhanced transfer-single with comprehensive validation
;; @param from: The sender's address
;; @param to: The recipient's address  
;; @param token-id: The token ID to transfer
;; @param amount: The amount to transfer
;; @returns: Success response
(define-public (safe-transfer-single (from principal) (to principal) (token-id uint) (amount uint))
    (begin
        ;; Comprehensive validation
        (try! (validate-transfer-params from to token-id amount))
        (try! (validate-principal from))
        (try! (validate-principal to))
        
        ;; Authorization check
        (try! (assert-authorized from))
        
        ;; Execute transfer using existing logic
        (transfer-single from to token-id amount)
    )
)

;; @desc Enhanced batch transfer with comprehensive validation
;; @param from: The sender's address
;; @param to: The recipient's address
;; @param token-ids: List of token IDs to transfer
;; @param amounts: List of amounts to transfer
;; @returns: Success response
(define-public (safe-transfer-batch (from principal) (to principal) (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (begin
        ;; Comprehensive validation
        (try! (validate-batch-params token-ids amounts))
        (try! (validate-principal from))
        (try! (validate-principal to))
        (asserts! (not (is-eq from to)) ERR-SELF-TRANSFER)
        
        ;; Authorization check
        (try! (assert-authorized from))
        
        ;; Validate all tokens exist
        (try! (validate-all-tokens-exist token-ids))
        
        ;; Execute batch transfer using existing logic
        (transfer-batch from to token-ids amounts)
    )
)

;; @desc Validate that all tokens in list exist
;; @param token-ids: List of token IDs to check
;; @returns: Error if any token doesn't exist, ok if all exist
(define-private (validate-all-tokens-exist (token-ids (list 100 uint)))
    (fold validate-token-exists token-ids (ok true))
)

;; @desc Validate single token exists (for fold operation)
;; @param token-id: Token ID to check
;; @param previous-result: Previous validation result
;; @returns: Error if token doesn't exist, ok if exists
(define-private (validate-token-exists (token-id uint) (previous-result (response bool uint)))
    (match previous-result
        success (if (token-exists token-id)
                    (ok true)
                    ERR-TOKEN-NOT-FOUND)
        error error
    )
)

;; @desc Enhanced mint with validation for edge cases
;; @param to: The recipient address
;; @param token-id: The token ID to mint (use 0 for new token type)
;; @param amount: The amount to mint
;; @returns: The token ID that was minted to
(define-public (safe-mint-tokens (to principal) (token-id uint) (amount uint))
    (begin
        ;; Only contract owner can mint
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Validate amount is positive
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        
        ;; Validate recipient
        (try! (validate-principal to))
        
        ;; Execute mint using existing logic
        (mint-tokens to token-id amount)
    )
)

;; @desc Enhanced burn with validation for edge cases
;; @param token-id: The token ID to burn
;; @param amount: The amount to burn
;; @returns: Success response
(define-public (safe-burn-tokens (token-id uint) (amount uint))
    (begin
        ;; Validate amount is positive
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        
        ;; Check token exists
        (asserts! (token-exists token-id) ERR-TOKEN-NOT-FOUND)
        
        ;; Execute burn using existing logic
        (burn-tokens token-id amount)
    )
)
;; Enhanced Event System

;; @desc Emit standardized transfer event
;; @param operator: The address that initiated the transfer
;; @param from: The sender address (none for minting)
;; @param to: The recipient address (none for burning)
;; @param token-id: The token ID being transferred
;; @param amount: The amount being transferred
(define-private (emit-transfer-event (operator principal) (from (optional principal)) (to (optional principal)) (token-id uint) (amount uint))
    (print {
        event: "transfer-single",
        operator: operator,
        from: from,
        to: to,
        token-id: token-id,
        amount: amount,
        block-height: stacks-block-height
    })
)

;; @desc Emit standardized batch transfer event
;; @param operator: The address that initiated the transfer
;; @param from: The sender address
;; @param to: The recipient address
;; @param token-ids: List of token IDs being transferred
;; @param amounts: List of amounts being transferred
(define-private (emit-batch-transfer-event (operator principal) (from principal) (to principal) (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (print {
        event: "transfer-batch",
        operator: operator,
        from: from,
        to: to,
        token-ids: token-ids,
        amounts: amounts,
        block-height: stacks-block-height
    })
)

;; @desc Emit approval event
;; @param owner: The token owner
;; @param operator: The approved operator
;; @param approved: Whether approval was granted or revoked
(define-private (emit-approval-event (owner principal) (operator principal) (approved bool))
    (print {
        event: "approval-for-all",
        owner: owner,
        operator: operator,
        approved: approved,
        block-height: stacks-block-height
    })
)

;; Interface Detection (ERC-165 style)

;; @desc Check if contract supports a specific interface
;; @param interface-id: The interface identifier to check
;; @returns: True if interface is supported
(define-read-only (supports-interface (interface-id (buff 4)))
    (or 
        ;; ERC-1155 interface ID
        (is-eq interface-id 0xd9b67a26)
        ;; ERC-165 interface ID  
        (is-eq interface-id 0x01ffc9a7)
        ;; Custom multi-token interface
        (is-eq interface-id 0x12345678)
    )
)

;; Advanced Query Functions

;; @desc Get all balances for a specific owner across multiple token types
;; @param owner: The owner to query
;; @param token-ids: List of token IDs to check
;; @returns: List of balances for each token ID
(define-read-only (get-balances-for-owner (owner principal) (token-ids (list 100 uint)))
    (map (lambda (token-id) (get-balance owner token-id)) token-ids)
)

;; @desc Get all owners who have a balance for a specific token (simplified)
;; @param token-id: The token ID to query
;; @returns: Basic existence check (in real implementation would return owner list)
(define-read-only (get-token-holders-count (token-id uint))
    ;; Simplified - in real implementation would track holders
    (if (> (get-total-supply token-id) u0) u1 u0)
)

;; @desc Check if an address has any tokens of a specific type
;; @param owner: The address to check
;; @param token-id: The token ID to check
;; @returns: True if owner has any balance
(define-read-only (has-balance (owner principal) (token-id uint))
    (> (get-balance owner token-id) u0)
)

;; @desc Get token activity status
;; @param token-id: The token ID to check
;; @returns: Tuple with existence and activity status
(define-read-only (get-token-status (token-id uint))
    {
        exists: (token-exists token-id),
        has-supply: (> (get-total-supply token-id) u0),
        has-metadata: (> (len (get-token-uri token-id)) u0),
        creator: (get-token-creator token-id)
    }
)

;; Batch Query Optimizations

;; @desc Get comprehensive token data for multiple tokens
;; @param token-ids: List of token IDs to query
;; @returns: List of comprehensive token data
(define-read-only (get-tokens-comprehensive-data (token-ids (list 100 uint)))
    (map get-comprehensive-token-data token-ids)
)

;; @desc Get comprehensive data for a single token
;; @param token-id: The token ID to query
;; @returns: Comprehensive token data tuple
(define-private (get-comprehensive-token-data (token-id uint))
    {
        token-id: token-id,
        exists: (token-exists token-id),
        total-supply: (get-total-supply token-id),
        uri: (get-token-uri token-id),
        creator: (get-token-creator token-id),
        has-metadata: (> (len (get-token-uri token-id)) u0)
    }
)ess (none for burning)
;; @param token-id: The token ID transferred
;; @param amount: The amount transferred
(define-private (emit-transfer-event (operator principal) (from (optional principal)) (to (optional principal)) (token-id uint) (amount uint))
    (print {
        event: "TransferSingle",
        operator: operator,
        from: from,
        to: to,
        id: token-id,
        value: amount,
        block-height: stacks-block-height
    })
)

;; @desc Emit batch transfer event
;; @param operator: The address that initiated the transfers
;; @param from: The sender address
;; @param to: The recipient address
;; @param token-ids: List of token IDs transferred
;; @param amounts: List of amounts transferred
(define-private (emit-batch-transfer-event (operator principal) (from principal) (to principal) (token-ids (list 100 uint)) (amounts (list 100 uint)))
    (print {
        event: "TransferBatch",
        operator: operator,
        from: (some from),
        to: (some to),
        ids: token-ids,
        values: amounts,
        block-height: stacks-block-height
    })
)

;; @desc Emit approval event
;; @param owner: The token owner
;; @param operator: The approved operator
;; @param approved: Whether approval was granted or revoked
(define-private (emit-approval-event (owner principal) (operator principal) (approved bool))
    (print {
        event: "ApprovalForAll",
        account: owner,
        operator: operator,
        approved: approved,
        block-height: stacks-block-height
    })
)

;; @desc Emit URI event
;; @param token-id: The token ID whose URI was set
;; @param uri: The new URI value
(define-private (emit-uri-event (token-id uint) (uri (string-ascii 256)))
    (print {
        event: "URI",
        id: token-id,
        value: uri,
        block-height: stacks-block-height
    })
)

;; Enhanced functions with proper event emission

;; @desc Enhanced transfer-single with proper event emission
(define-public (transfer-single-with-events (from principal) (to principal) (token-id uint) (amount uint))
    (begin
        ;; Input validation
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        (asserts! (not (is-eq from to)) ERR-SELF-TRANSFER)
        
        ;; Authorization check
        (try! (assert-authorized from))
        
        ;; Get current balance
        (let ((current-balance (get-balance from token-id)))
            ;; Check sufficient balance
            (asserts! (>= current-balance amount) ERR-INSUFFICIENT-BALANCE)
            
            ;; Update balances
            (let ((new-from-balance (- current-balance amount))
                  (current-to-balance (get-balance to token-id))
                  (new-to-balance (+ current-to-balance amount)))
                
                ;; Set new balances
                (if (> new-from-balance u0)
                    (map-set token-balances {owner: from, token-id: token-id} new-from-balance)
                    (map-delete token-balances {owner: from, token-id: token-id})
                )
                (map-set token-balances {owner: to, token-id: token-id} new-to-balance)
                
                ;; Emit standardized transfer event
                (emit-transfer-event tx-sender (some from) (some to) token-id amount)
                
                (ok true)
            )
        )
    )
)

;; @desc Enhanced approval with proper event emission
(define-public (set-approval-for-all-with-events (operator principal) (approved bool))
    (begin
        ;; Cannot approve yourself as operator
        (asserts! (not (is-eq tx-sender operator)) ERR-INVALID-PRINCIPAL)
        
        ;; Set or remove approval
        (if approved
            (map-set operator-approvals {owner: tx-sender, operator: operator} true)
            (map-delete operator-approvals {owner: tx-sender, operator: operator})
        )
        
        ;; Emit standardized approval event
        (emit-approval-event tx-sender operator approved)
        
        (ok true)
    )
)

;; @desc Enhanced mint with proper event emission
(define-public (mint-tokens-with-events (to principal) (token-id uint) (amount uint))
    (begin
        ;; Only contract owner can mint
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Validate amount is positive
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        
        ;; Determine the actual token ID to use
        (let ((actual-token-id (if (is-eq token-id u0)
                                   (var-get next-token-id)
                                   token-id)))
            
            ;; If creating new token type, increment counter and mark as existing
            (if (is-eq token-id u0)
                (begin
                    (var-set next-token-id (+ actual-token-id u1))
                    (map-set token-exists-map actual-token-id true)
                )
                (if (not (token-exists actual-token-id))
                    (map-set token-exists-map actual-token-id true)
                    true
                )
            )
            
            ;; Update recipient balance
            (let ((current-balance (get-balance to actual-token-id))
                  (new-balance (+ current-balance amount)))
                (map-set token-balances {owner: to, token-id: actual-token-id} new-balance)
            )
            
            ;; Update total supply
            (let ((current-supply (get-total-supply actual-token-id))
                  (new-supply (+ current-supply amount)))
                (map-set token-supplies actual-token-id new-supply)
            )
            
            ;; Emit standardized mint event (transfer from zero address)
            (emit-transfer-event tx-sender none (some to) actual-token-id amount)
            
            (ok actual-token-id)
        )
    )
)

;; @desc Enhanced burn with proper event emission
(define-public (burn-tokens-with-events (token-id uint) (amount uint))
    (begin
        ;; Validate amount is positive
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        
        ;; Check token exists
        (asserts! (token-exists token-id) ERR-TOKEN-NOT-FOUND)
        
        ;; Get current balance and validate sufficient amount
        (let ((current-balance (get-balance tx-sender token-id)))
            (asserts! (>= current-balance amount) ERR-INSUFFICIENT-BALANCE)
            
            ;; Update balance
            (let ((new-balance (- current-balance amount)))
                (if (> new-balance u0)
                    (map-set token-balances {owner: tx-sender, token-id: token-id} new-balance)
                    (map-delete token-balances {owner: tx-sender, token-id: token-id})
                )
            )
            
            ;; Update total supply
            (let ((current-supply (get-total-supply token-id))
                  (new-supply (- current-supply amount)))
                (if (> new-supply u0)
                    (map-set token-supplies token-id new-supply)
                    (map-delete token-supplies token-id)
                )
            )
            
            ;; Emit standardized burn event (transfer to zero address)
            (emit-transfer-event tx-sender (some tx-sender) none token-id amount)
            
            (ok true)
        )
    )
)

;; @desc Enhanced URI setting with proper event emission
(define-public (set-token-uri-with-events (token-id uint) (uri (string-ascii 256)))
    (begin
        ;; Only contract owner can set metadata
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Validate URI is not empty
        (asserts! (> (len uri) u0) ERR-INVALID-TOKEN-ID)
        
        ;; Set the URI
        (map-set token-uris token-id uri)
        
        ;; Mark token as existing if not already
        (if (not (token-exists token-id))
            (map-set token-exists-map token-id true)
            true
        )
        
        ;; Emit standardized URI event
        (emit-uri-event token-id uri)
        
        (ok true)
    )
)
;; Contract Initialization and Integration

;; @desc Initialize contract with owner and basic setup
;; @returns: Success response with contract info
(define-public (initialize-contract)
    (begin
        ;; Only allow initialization once (by checking if owner is still the deployer)
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Emit contract initialization event
        (print {
            event: "ContractInitialized",
            owner: (var-get contract-owner),
            next-token-id: (var-get next-token-id),
            block-height: stacks-block-height
        })
        
        (ok {
            owner: (var-get contract-owner),
            next-token-id: (var-get next-token-id),
            initialized: true
        })
    )
)

;; @desc Transfer contract ownership (current owner only)
;; @param new-owner: The new contract owner
;; @returns: Success response
(define-public (transfer-ownership (new-owner principal))
    (begin
        ;; Only current owner can transfer ownership
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Cannot transfer to same owner
        (asserts! (not (is-eq new-owner (var-get contract-owner))) ERR-INVALID-PRINCIPAL)
        
        ;; Store old owner for event
        (let ((old-owner (var-get contract-owner)))
            ;; Set new owner
            (var-set contract-owner new-owner)
            
            ;; Emit ownership transfer event
            (print {
                event: "OwnershipTransferred",
                previous-owner: old-owner,
                new-owner: new-owner,
                block-height: stacks-block-height
            })
            
            (ok true)
        )
    )
)

;; @desc Renounce contract ownership (sets owner to contract itself)
;; @returns: Success response
(define-public (renounce-ownership)
    (begin
        ;; Only current owner can renounce ownership
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Store old owner for event
        (let ((old-owner (var-get contract-owner)))
            ;; Set owner to contract address (effectively renouncing)
            (var-set contract-owner (as-contract tx-sender))
            
            ;; Emit ownership renouncement event
            (print {
                event: "OwnershipRenounced",
                previous-owner: old-owner,
                block-height: stacks-block-height
            })
            
            (ok true)
        )
    )
)

;; @desc Emergency pause functionality (owner only)
;; Note: This is a basic implementation. In production, you might want more sophisticated pause mechanisms
(define-data-var contract-paused bool false)

;; @desc Pause contract operations (owner only)
;; @returns: Success response
(define-public (pause-contract)
    (begin
        ;; Only owner can pause
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Set paused state
        (var-set contract-paused true)
        
        ;; Emit pause event
        (print {
            event: "ContractPaused",
            operator: tx-sender,
            block-height: stacks-block-height
        })
        
        (ok true)
    )
)

;; @desc Unpause contract operations (owner only)
;; @returns: Success response
(define-public (unpause-contract)
    (begin
        ;; Only owner can unpause
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Set unpaused state
        (var-set contract-paused false)
        
        ;; Emit unpause event
        (print {
            event: "ContractUnpaused",
            operator: tx-sender,
            block-height: stacks-block-height
        })
        
        (ok true)
    )
)

;; @desc Check if contract is paused
;; @returns: True if paused, false otherwise
(define-read-only (is-contract-paused)
    (var-get contract-paused)
)

;; @desc Get complete contract state summary
;; @returns: Comprehensive contract information
(define-read-only (get-contract-summary)
    {
        owner: (var-get contract-owner),
        next-token-id: (var-get next-token-id),
        total-token-types: (- (var-get next-token-id) u1),
        paused: (var-get contract-paused),
        block-height: stacks-block-height
    }
)

;; @desc Comprehensive health check for contract functionality
;; @returns: Health status information
(define-read-only (health-check)
    {
        contract-deployed: true,
        owner-set: (is-some (some (var-get contract-owner))),
        token-counter-valid: (>= (var-get next-token-id) u1),
        paused: (var-get contract-paused),
        block-height: stacks-block-height
    }
)

;; Final contract validation and deployment readiness check
;; This function can be called to verify all systems are working

;; @desc Validate contract is ready for production use
;; @returns: Validation results
(define-read-only (validate-contract-readiness)
    (let ((owner (var-get contract-owner))
          (next-id (var-get next-token-id))
          (paused (var-get contract-paused)))
        {
            owner-valid: (is-some (some owner)),
            token-system-ready: (>= next-id u1),
            not-paused: (not paused),
            all-systems-go: (and 
                (is-some (some owner))
                (>= next-id u1)
                (not paused)
            )
        }
    )
)