;; Multi-Token Factory Contract
;; Deploys and manages multiple ERC1155-like contracts
;; Version 1.0

;; Constants
(define-constant ERR-UNAUTHORIZED (err u401))
(define-constant ERR-INVALID-NAME (err u402))
(define-constant ERR-CONTRACT-EXISTS (err u403))
(define-constant ERR-CONTRACT-NOT-FOUND (err u404))
(define-constant ERR-INVALID-PRINCIPAL (err u405))

;; Contract owner
(define-data-var factory-owner principal tx-sender)

;; Contract counter for unique naming
(define-data-var contract-counter uint u0)

;; Registry of deployed contracts
(define-map deployed-contracts 
    uint ;; contract-id
    {
        name: (string-ascii 64),
        contract-principal: principal,
        deployer: principal,
        deployed-at: uint,
        active: bool
    }
)

;; Name to contract ID mapping
(define-map contract-names (string-ascii 64) uint)

;; Deployer to contracts mapping
(define-map deployer-contracts principal (list 100 uint))

;; @desc Deploy a new multi-token contract
;; @param name: Unique name for the contract
;; @returns: The contract ID of the deployed contract
(define-public (deploy-multi-token-contract (name (string-ascii 64)))
    (let ((contract-id (+ (var-get contract-counter) u1))
          (deployer tx-sender))
        
        ;; Validate name is not empty
        (asserts! (> (len name) u0) ERR-INVALID-NAME)
        
        ;; Check name is unique
        (asserts! (is-none (map-get? contract-names name)) ERR-CONTRACT-EXISTS)
        
        ;; Update counter
        (var-set contract-counter contract-id)
        
        ;; Register contract (using tx-sender as placeholder for actual contract principal)
        (map-set deployed-contracts contract-id {
            name: name,
            contract-principal: tx-sender, ;; In real implementation, this would be the deployed contract
            deployer: deployer,
            deployed-at: stacks-block-height,
            active: true
        })
        
        ;; Map name to ID
        (map-set contract-names name contract-id)
        
        ;; Add to deployer's contracts
        (let ((current-contracts (default-to (list) (map-get? deployer-contracts deployer))))
            (map-set deployer-contracts deployer (unwrap-panic (as-max-len? (append current-contracts contract-id) u100)))
        )
        
        ;; Emit deployment event
        (print {
            event: "contract-deployed",
            contract-id: contract-id,
            name: name,
            deployer: deployer,
            deployed-at: stacks-block-height
        })
        
        (ok contract-id)
    )
)

;; @desc Get contract information by ID
;; @param contract-id: The contract ID to query
;; @returns: Contract information or none
(define-read-only (get-contract-info (contract-id uint))
    (map-get? deployed-contracts contract-id)
)

;; @desc Get contract ID by name
;; @param name: The contract name to lookup
;; @returns: Contract ID or none
(define-read-only (get-contract-id-by-name (name (string-ascii 64)))
    (map-get? contract-names name)
)

;; @desc Get contracts deployed by a specific address
;; @param deployer: The deployer address
;; @returns: List of contract IDs
(define-read-only (get-contracts-by-deployer (deployer principal))
    (default-to (list) (map-get? deployer-contracts deployer))
)

;; @desc Get total number of deployed contracts
;; @returns: Total contract count
(define-read-only (get-total-contracts)
    (var-get contract-counter)
)

;; @desc Deactivate a contract (owner or deployer only)
;; @param contract-id: The contract ID to deactivate
;; @returns: Success response
(define-public (deactivate-contract (contract-id uint))
    (let ((contract-info (unwrap! (map-get? deployed-contracts contract-id) ERR-CONTRACT-NOT-FOUND)))
        
        ;; Check authorization (factory owner or contract deployer)
        (asserts! (or 
            (is-eq tx-sender (var-get factory-owner))
            (is-eq tx-sender (get deployer contract-info))
        ) ERR-UNAUTHORIZED)
        
        ;; Update contract status
        (map-set deployed-contracts contract-id 
            (merge contract-info {active: false}))
        
        ;; Emit deactivation event
        (print {
            event: "contract-deactivated",
            contract-id: contract-id,
            deactivated-by: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Transfer factory ownership
;; @param new-owner: The new factory owner
;; @returns: Success response
(define-public (transfer-factory-ownership (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get factory-owner)) ERR-UNAUTHORIZED)
        (asserts! (not (is-eq new-owner (var-get factory-owner))) ERR-INVALID-PRINCIPAL)
        
        (var-set factory-owner new-owner)
        
        (print {
            event: "factory-ownership-transferred",
            previous-owner: tx-sender,
            new-owner: new-owner
        })
        
        (ok true)
    )
)

;; @desc Get factory owner
;; @returns: The factory owner principal
(define-read-only (get-factory-owner)
    (var-get factory-owner)
)

;; @desc Get factory statistics
;; @returns: Factory statistics tuple
(define-read-only (get-factory-stats)
    {
        owner: (var-get factory-owner),
        total-contracts: (var-get contract-counter),
        deployed-at: stacks-block-height
    }
)