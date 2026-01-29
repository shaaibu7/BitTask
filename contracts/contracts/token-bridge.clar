;; Multi-Token Bridge Contract
;; Enables cross-chain token transfers
;; Version 1.0

;; Constants
(define-constant ERR-UNAUTHORIZED (err u701))
(define-constant ERR-INVALID-AMOUNT (err u702))
(define-constant ERR-BRIDGE-PAUSED (err u703))
(define-constant ERR-INVALID-CHAIN (err u704))
(define-constant ERR-TRANSFER-NOT-FOUND (err u705))
(define-constant ERR-ALREADY-PROCESSED (err u706))
(define-constant ERR-INSUFFICIENT-FEE (err u707))

;; Bridge owner
(define-data-var bridge-owner principal tx-sender)

;; Bridge status
(define-data-var bridge-paused bool false)

;; Bridge fee (in STX)
(define-data-var bridge-fee uint u1000000) ;; 1 STX

;; Transfer counter
(define-data-var transfer-counter uint u0)

;; Supported chains
(define-map supported-chains (string-ascii 32) bool)

;; Bridge transfers
(define-map bridge-transfers
    uint ;; transfer-id
    {
        sender: principal,
        recipient: (string-ascii 64), ;; Address on destination chain
        token-contract: principal,
        token-id: uint,
        amount: uint,
        destination-chain: (string-ascii 32),
        fee-paid: uint,
        status: (string-ascii 16), ;; "pending", "completed", "failed"
        created-at: uint,
        processed-at: (optional uint)
    }
)

;; Incoming transfers (from other chains)
(define-map incoming-transfers
    (string-ascii 64) ;; external-tx-hash
    {
        recipient: principal,
        token-contract: principal,
        token-id: uint,
        amount: uint,
        source-chain: (string-ascii 32),
        processed: bool,
        processed-at: (optional uint)
    }
)

;; User transfers
(define-map user-transfers principal (list 100 uint))

;; @desc Initialize bridge with supported chains
(define-public (initialize-bridge)
    (begin
        (asserts! (is-eq tx-sender (var-get bridge-owner)) ERR-UNAUTHORIZED)
        
        ;; Add default supported chains
        (map-set supported-chains "ethereum" true)
        (map-set supported-chains "polygon" true)
        (map-set supported-chains "bsc" true)
        
        (print {
            event: "bridge-initialized",
            supported-chains: (list "ethereum" "polygon" "bsc")
        })
        
        (ok true)
    )
)

;; @desc Initiate a cross-chain transfer
;; @param token-contract: The token contract address
;; @param token-id: The token ID to bridge
;; @param amount: Amount of tokens to bridge
;; @param recipient: Recipient address on destination chain
;; @param destination-chain: Target blockchain
;; @returns: Transfer ID
(define-public (initiate-transfer
    (token-contract principal)
    (token-id uint)
    (amount uint)
    (recipient (string-ascii 64))
    (destination-chain (string-ascii 32)))
    (let ((transfer-id (+ (var-get transfer-counter) u1))
          (fee (var-get bridge-fee)))
        
        ;; Check bridge is not paused
        (asserts! (not (var-get bridge-paused)) ERR-BRIDGE-PAUSED)
        
        ;; Validate inputs
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (asserts! (> (len recipient) u0) ERR-INVALID-AMOUNT)
        
        ;; Check destination chain is supported
        (asserts! (default-to false (map-get? supported-chains destination-chain)) ERR-INVALID-CHAIN)
        
        ;; Collect bridge fee
        (try! (stx-transfer? fee tx-sender (var-get bridge-owner)))
        
        ;; TODO: Lock tokens in bridge contract
        ;; This would require calling the token contract's transfer function
        
        ;; Update counter
        (var-set transfer-counter transfer-id)
        
        ;; Create transfer record
        (map-set bridge-transfers transfer-id {
            sender: tx-sender,
            recipient: recipient,
            token-contract: token-contract,
            token-id: token-id,
            amount: amount,
            destination-chain: destination-chain,
            fee-paid: fee,
            status: "pending",
            created-at: stacks-block-height,
            processed-at: none
        })
        
        ;; Add to user transfers
        (let ((user-transfer-list (default-to (list) (map-get? user-transfers tx-sender))))
            (map-set user-transfers tx-sender
                (unwrap-panic (as-max-len? (append user-transfer-list transfer-id) u100)))
        )
        
        ;; Emit transfer event
        (print {
            event: "bridge-transfer-initiated",
            transfer-id: transfer-id,
            sender: tx-sender,
            recipient: recipient,
            token-contract: token-contract,
            token-id: token-id,
            amount: amount,
            destination-chain: destination-chain,
            fee-paid: fee
        })
        
        (ok transfer-id)
    )
)

;; @desc Process incoming transfer from another chain (owner only)
;; @param external-tx-hash: Transaction hash from source chain
;; @param recipient: Recipient on Stacks
;; @param token-contract: Token contract to mint/transfer
;; @param token-id: Token ID
;; @param amount: Amount to transfer
;; @param source-chain: Source blockchain
;; @returns: Success response
(define-public (process-incoming-transfer
    (external-tx-hash (string-ascii 64))
    (recipient principal)
    (token-contract principal)
    (token-id uint)
    (amount uint)
    (source-chain (string-ascii 32)))
    (begin
        ;; Only bridge owner can process incoming transfers
        (asserts! (is-eq tx-sender (var-get bridge-owner)) ERR-UNAUTHORIZED)
        
        ;; Check transfer hasn't been processed
        (asserts! (is-none (map-get? incoming-transfers external-tx-hash)) ERR-ALREADY-PROCESSED)
        
        ;; Validate inputs
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (asserts! (> (len external-tx-hash) u0) ERR-INVALID-AMOUNT)
        
        ;; TODO: Mint or transfer tokens to recipient
        ;; This would require calling the token contract's mint function
        
        ;; Record incoming transfer
        (map-set incoming-transfers external-tx-hash {
            recipient: recipient,
            token-contract: token-contract,
            token-id: token-id,
            amount: amount,
            source-chain: source-chain,
            processed: true,
            processed-at: (some stacks-block-height)
        })
        
        ;; Emit incoming transfer event
        (print {
            event: "incoming-transfer-processed",
            external-tx-hash: external-tx-hash,
            recipient: recipient,
            token-contract: token-contract,
            token-id: token-id,
            amount: amount,
            source-chain: source-chain,
            processed-at: stacks-block-height
        })
        
        (ok true)
    )
)

;; @desc Complete an outgoing transfer (owner only)
;; @param transfer-id: The transfer ID to complete
;; @param external-tx-hash: Transaction hash on destination chain
;; @returns: Success response
(define-public (complete-transfer (transfer-id uint) (external-tx-hash (string-ascii 64)))
    (let ((transfer (unwrap! (map-get? bridge-transfers transfer-id) ERR-TRANSFER-NOT-FOUND)))
        
        ;; Only bridge owner can complete transfers
        (asserts! (is-eq tx-sender (var-get bridge-owner)) ERR-UNAUTHORIZED)
        
        ;; Check transfer is pending
        (asserts! (is-eq (get status transfer) "pending") ERR-ALREADY-PROCESSED)
        
        ;; Update transfer status
        (map-set bridge-transfers transfer-id
            (merge transfer {
                status: "completed",
                processed-at: (some stacks-block-height)
            }))
        
        ;; Emit completion event
        (print {
            event: "bridge-transfer-completed",
            transfer-id: transfer-id,
            external-tx-hash: external-tx-hash,
            sender: (get sender transfer),
            recipient: (get recipient transfer),
            destination-chain: (get destination-chain transfer)
        })
        
        (ok true)
    )
)

;; @desc Fail a transfer and refund tokens (owner only)
;; @param transfer-id: The transfer ID to fail
;; @param reason: Failure reason
;; @returns: Success response
(define-public (fail-transfer (transfer-id uint) (reason (string-ascii 128)))
    (let ((transfer (unwrap! (map-get? bridge-transfers transfer-id) ERR-TRANSFER-NOT-FOUND)))
        
        ;; Only bridge owner can fail transfers
        (asserts! (is-eq tx-sender (var-get bridge-owner)) ERR-UNAUTHORIZED)
        
        ;; Check transfer is pending
        (asserts! (is-eq (get status transfer) "pending") ERR-ALREADY-PROCESSED)
        
        ;; TODO: Refund tokens to sender
        ;; This would require calling the token contract's transfer function
        
        ;; Update transfer status
        (map-set bridge-transfers transfer-id
            (merge transfer {
                status: "failed",
                processed-at: (some stacks-block-height)
            }))
        
        ;; Emit failure event
        (print {
            event: "bridge-transfer-failed",
            transfer-id: transfer-id,
            sender: (get sender transfer),
            reason: reason,
            refunded-at: stacks-block-height
        })
        
        (ok true)
    )
)

;; @desc Get transfer information
;; @param transfer-id: The transfer ID to query
;; @returns: Transfer information or none
(define-read-only (get-transfer (transfer-id uint))
    (map-get? bridge-transfers transfer-id)
)

;; @desc Get incoming transfer information
;; @param external-tx-hash: The external transaction hash
;; @returns: Incoming transfer information or none
(define-read-only (get-incoming-transfer (external-tx-hash (string-ascii 64)))
    (map-get? incoming-transfers external-tx-hash)
)

;; @desc Get user transfers
;; @param user: The user address
;; @returns: List of transfer IDs
(define-read-only (get-user-transfers (user principal))
    (default-to (list) (map-get? user-transfers user))
)

;; @desc Check if chain is supported
;; @param chain: The chain name to check
;; @returns: True if supported
(define-read-only (is-chain-supported (chain (string-ascii 32)))
    (default-to false (map-get? supported-chains chain))
)

;; @desc Get bridge statistics
;; @returns: Bridge statistics
(define-read-only (get-bridge-stats)
    {
        owner: (var-get bridge-owner),
        paused: (var-get bridge-paused),
        fee: (var-get bridge-fee),
        total-transfers: (var-get transfer-counter)
    }
)

;; @desc Add supported chain (owner only)
;; @param chain: Chain name to add
;; @returns: Success response
(define-public (add-supported-chain (chain (string-ascii 32)))
    (begin
        (asserts! (is-eq tx-sender (var-get bridge-owner)) ERR-UNAUTHORIZED)
        
        (map-set supported-chains chain true)
        
        (print {
            event: "chain-added",
            chain: chain,
            added-by: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Update bridge fee (owner only)
;; @param new-fee: New bridge fee in STX
;; @returns: Success response
(define-public (update-bridge-fee (new-fee uint))
    (begin
        (asserts! (is-eq tx-sender (var-get bridge-owner)) ERR-UNAUTHORIZED)
        
        (var-set bridge-fee new-fee)
        
        (print {
            event: "bridge-fee-updated",
            new-fee: new-fee,
            updated-by: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Toggle bridge pause status (owner only)
;; @returns: Success response
(define-public (toggle-bridge-pause)
    (begin
        (asserts! (is-eq tx-sender (var-get bridge-owner)) ERR-UNAUTHORIZED)
        
        (let ((new-status (not (var-get bridge-paused))))
            (var-set bridge-paused new-status)
            
            (print {
                event: "bridge-pause-toggled",
                paused: new-status,
                updated-by: tx-sender
            })
            
            (ok new-status)
        )
    )
)