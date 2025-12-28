;; ERC1155-like Multi-Token Contract
;; Implements multi-token functionality similar to ERC1155 standard

;; Constants and Error Codes
(define-constant ERR-INSUFFICIENT-BALANCE (err u100))
(define-constant ERR-UNAUTHORIZED (err u101))
(define-constant ERR-INVALID-TOKEN-ID (err u102))
(define-constant ERR-ZERO-AMOUNT (err u103))
(define-constant ERR-SELF-TRANSFER (err u104))
(define-constant ERR-ARRAY-LENGTH-MISMATCH (err u105))
(define-constant ERR-TOKEN-NOT-FOUND (err u106))
(define-constant ERR-INVALID-PRINCIPAL (err u107))

;; Contract owner
(define-data-var contract-owner principal tx-sender)

;; Token ID counter for unique token generation
(define-data-var next-token-id uint u1)

;; Data Maps

;; Token balances: (owner, token-id) -> balance
(define-map token-balances {owner: principal, token-id: uint} uint)

;; Operator approvals: (owner, operator) -> approved
(define-map operator-approvals {owner: principal, operator: principal} bool)

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

;; @desc Get multiple balances efficiently in a single call
;; @param owners: List of principals to query
;; @param token-ids: List of token IDs to query (must match owners length)
;; @returns: List of balances corresponding to each owner/token-id pair
(define-read-only (get-balance-batch (owners (list 100 principal)) (token-ids (list 100 uint)))
    (let ((owners-length (len owners))
          (token-ids-length (len token-ids)))
        ;; Ensure arrays have same length
        (asserts! (is-eq owners-length token-ids-length) ERR-ARRAY-LENGTH-MISMATCH)
        
        ;; Map over the pairs and get balances
        (ok (map get-balance-pair (zip owners token-ids)))
    )
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

;; @desc Get the contract owner
;; @returns: The principal that owns this contract
(define-read-only (get-contract-owner)
    (var-get contract-owner)
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

;; @desc Enhanced transfer validation with comprehensive checks
;; @param from: Sender address
;; @param to: Recipient address  
;; @param token-id: Token ID
;; @param amount: Transfer amount
;; @returns: Success if all validations pass
(define-private (validate-transfer (from principal) (to principal) (token-id uint) (amount uint))
    (begin
        ;; Basic validations
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)
        (asserts! (not (is-eq from to)) ERR-SELF-TRANSFER)
        (asserts! (is-valid-principal from) ERR-INVALID-PRINCIPAL)
        (asserts! (is-valid-principal to) ERR-INVALID-PRINCIPAL)
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