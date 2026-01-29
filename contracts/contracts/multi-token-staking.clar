;; Multi-Token Staking Contract
;; Allows staking of ERC1155-like tokens for rewards
;; Version 1.0

;; Constants
(define-constant ERR-UNAUTHORIZED (err u601))
(define-constant ERR-INVALID-AMOUNT (err u602))
(define-constant ERR-POOL-NOT-FOUND (err u603))
(define-constant ERR-INSUFFICIENT-STAKE (err u604))
(define-constant ERR-POOL-EXISTS (err u605))
(define-constant ERR-POOL-INACTIVE (err u606))
(define-constant ERR-INVALID-DURATION (err u607))

;; Contract owner
(define-data-var staking-owner principal tx-sender)

;; Pool counter
(define-data-var pool-counter uint u0)

;; Staking pools
(define-map staking-pools
    uint ;; pool-id
    {
        token-contract: principal,
        token-id: uint,
        reward-rate: uint, ;; Rewards per block per token
        min-stake-amount: uint,
        max-stake-amount: uint,
        total-staked: uint,
        active: bool,
        created-at: uint,
        created-by: principal
    }
)

;; User stakes
(define-map user-stakes
    {user: principal, pool-id: uint}
    {
        amount: uint,
        staked-at: uint,
        last-claim: uint,
        total-rewards-claimed: uint
    }
)

;; Pool participants
(define-map pool-participants uint (list 100 principal))

;; User pools
(define-map user-pools principal (list 50 uint))

;; @desc Create a new staking pool
;; @param token-contract: The token contract to stake
;; @param token-id: The token ID to stake
;; @param reward-rate: Rewards per block per token staked
;; @param min-stake: Minimum stake amount
;; @param max-stake: Maximum stake amount
;; @returns: The pool ID
(define-public (create-staking-pool 
    (token-contract principal)
    (token-id uint)
    (reward-rate uint)
    (min-stake uint)
    (max-stake uint))
    (let ((pool-id (+ (var-get pool-counter) u1)))
        
        ;; Only owner can create pools
        (asserts! (is-eq tx-sender (var-get staking-owner)) ERR-UNAUTHORIZED)
        
        ;; Validate parameters
        (asserts! (> reward-rate u0) ERR-INVALID-AMOUNT)
        (asserts! (> min-stake u0) ERR-INVALID-AMOUNT)
        (asserts! (>= max-stake min-stake) ERR-INVALID-AMOUNT)
        
        ;; Update counter
        (var-set pool-counter pool-id)
        
        ;; Create pool
        (map-set staking-pools pool-id {
            token-contract: token-contract,
            token-id: token-id,
            reward-rate: reward-rate,
            min-stake-amount: min-stake,
            max-stake-amount: max-stake,
            total-staked: u0,
            active: true,
            created-at: stacks-block-height,
            created-by: tx-sender
        })
        
        ;; Emit pool creation event
        (print {
            event: "staking-pool-created",
            pool-id: pool-id,
            token-contract: token-contract,
            token-id: token-id,
            reward-rate: reward-rate,
            min-stake: min-stake,
            max-stake: max-stake,
            created-by: tx-sender
        })
        
        (ok pool-id)
    )
)

;; @desc Stake tokens in a pool
;; @param pool-id: The pool to stake in
;; @param amount: Amount of tokens to stake
;; @returns: Success response
(define-public (stake-tokens (pool-id uint) (amount uint))
    (let ((pool (unwrap! (map-get? staking-pools pool-id) ERR-POOL-NOT-FOUND))
          (current-stake (default-to 
            {amount: u0, staked-at: u0, last-claim: u0, total-rewards-claimed: u0}
            (map-get? user-stakes {user: tx-sender, pool-id: pool-id}))))
        
        ;; Validate pool is active
        (asserts! (get active pool) ERR-POOL-INACTIVE)
        
        ;; Validate stake amount
        (asserts! (>= amount (get min-stake-amount pool)) ERR-INVALID-AMOUNT)
        (let ((new-total-stake (+ (get amount current-stake) amount)))
            (asserts! (<= new-total-stake (get max-stake-amount pool)) ERR-INVALID-AMOUNT)
            
            ;; TODO: Transfer tokens from user to contract
            ;; This would require calling the token contract's transfer function
            
            ;; Update user stake
            (map-set user-stakes {user: tx-sender, pool-id: pool-id} {
                amount: new-total-stake,
                staked-at: (if (is-eq (get amount current-stake) u0) 
                    stacks-block-height 
                    (get staked-at current-stake)),
                last-claim: stacks-block-height,
                total-rewards-claimed: (get total-rewards-claimed current-stake)
            })
            
            ;; Update pool total
            (map-set staking-pools pool-id 
                (merge pool {total-staked: (+ (get total-staked pool) amount)}))
            
            ;; Add user to pool participants if first stake
            (if (is-eq (get amount current-stake) u0)
                (let ((participants (default-to (list) (map-get? pool-participants pool-id))))
                    (map-set pool-participants pool-id
                        (unwrap-panic (as-max-len? (append participants tx-sender) u100)))
                )
                true
            )
            
            ;; Add pool to user pools if first stake
            (if (is-eq (get amount current-stake) u0)
                (let ((user-pool-list (default-to (list) (map-get? user-pools tx-sender))))
                    (map-set user-pools tx-sender
                        (unwrap-panic (as-max-len? (append user-pool-list pool-id) u50)))
                )
                true
            )
            
            ;; Emit staking event
            (print {
                event: "tokens-staked",
                user: tx-sender,
                pool-id: pool-id,
                amount: amount,
                new-total-stake: new-total-stake,
                staked-at: stacks-block-height
            })
            
            (ok true)
        )
    )
)

;; @desc Unstake tokens from a pool
;; @param pool-id: The pool to unstake from
;; @param amount: Amount of tokens to unstake
;; @returns: Success response
(define-public (unstake-tokens (pool-id uint) (amount uint))
    (let ((pool (unwrap! (map-get? staking-pools pool-id) ERR-POOL-NOT-FOUND))
          (user-stake (unwrap! (map-get? user-stakes {user: tx-sender, pool-id: pool-id}) ERR-INSUFFICIENT-STAKE)))
        
        ;; Validate unstake amount
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (asserts! (<= amount (get amount user-stake)) ERR-INSUFFICIENT-STAKE)
        
        ;; Calculate pending rewards before unstaking
        (let ((pending-rewards (calculate-pending-rewards tx-sender pool-id))
              (new-stake-amount (- (get amount user-stake) amount)))
            
            ;; TODO: Transfer tokens back to user
            ;; This would require calling the token contract's transfer function
            
            ;; Update user stake
            (if (is-eq new-stake-amount u0)
                ;; Remove stake completely
                (map-delete user-stakes {user: tx-sender, pool-id: pool-id})
                ;; Update stake amount
                (map-set user-stakes {user: tx-sender, pool-id: pool-id}
                    (merge user-stake {
                        amount: new-stake-amount,
                        last-claim: stacks-block-height
                    }))
            )
            
            ;; Update pool total
            (map-set staking-pools pool-id
                (merge pool {total-staked: (- (get total-staked pool) amount)}))
            
            ;; Emit unstaking event
            (print {
                event: "tokens-unstaked",
                user: tx-sender,
                pool-id: pool-id,
                amount: amount,
                pending-rewards: pending-rewards,
                remaining-stake: new-stake-amount
            })
            
            (ok true)
        )
    )
)

;; @desc Claim staking rewards
;; @param pool-id: The pool to claim rewards from
;; @returns: Success response
(define-public (claim-rewards (pool-id uint))
    (let ((pool (unwrap! (map-get? staking-pools pool-id) ERR-POOL-NOT-FOUND))
          (user-stake (unwrap! (map-get? user-stakes {user: tx-sender, pool-id: pool-id}) ERR-INSUFFICIENT-STAKE)))
        
        ;; Calculate pending rewards
        (let ((pending-rewards (calculate-pending-rewards tx-sender pool-id)))
            
            ;; Only claim if there are rewards
            (asserts! (> pending-rewards u0) ERR-INVALID-AMOUNT)
            
            ;; TODO: Transfer reward tokens to user
            ;; This would require minting or transferring reward tokens
            
            ;; Update user stake with new claim time
            (map-set user-stakes {user: tx-sender, pool-id: pool-id}
                (merge user-stake {
                    last-claim: stacks-block-height,
                    total-rewards-claimed: (+ (get total-rewards-claimed user-stake) pending-rewards)
                }))
            
            ;; Emit claim event
            (print {
                event: "rewards-claimed",
                user: tx-sender,
                pool-id: pool-id,
                amount: pending-rewards,
                total-claimed: (+ (get total-rewards-claimed user-stake) pending-rewards)
            })
            
            (ok pending-rewards)
        )
    )
)

;; @desc Calculate pending rewards for a user in a pool
;; @param user: The user address
;; @param pool-id: The pool ID
;; @returns: Pending reward amount
(define-read-only (calculate-pending-rewards (user principal) (pool-id uint))
    (match (map-get? user-stakes {user: user, pool-id: pool-id})
        user-stake (match (map-get? staking-pools pool-id)
            pool (let ((blocks-staked (- stacks-block-height (get last-claim user-stake)))
                       (stake-amount (get amount user-stake))
                       (reward-rate (get reward-rate pool)))
                (* blocks-staked (* stake-amount reward-rate))
            )
            u0
        )
        u0
    )
)

;; @desc Get pool information
;; @param pool-id: The pool ID to query
;; @returns: Pool information or none
(define-read-only (get-pool-info (pool-id uint))
    (map-get? staking-pools pool-id)
)

;; @desc Get user stake information
;; @param user: The user address
;; @param pool-id: The pool ID
;; @returns: User stake information or none
(define-read-only (get-user-stake (user principal) (pool-id uint))
    (map-get? user-stakes {user: user, pool-id: pool-id})
)

;; @desc Get pools a user is staking in
;; @param user: The user address
;; @returns: List of pool IDs
(define-read-only (get-user-pools (user principal))
    (default-to (list) (map-get? user-pools user))
)

;; @desc Get staking statistics
;; @returns: Staking contract statistics
(define-read-only (get-staking-stats)
    {
        owner: (var-get staking-owner),
        total-pools: (var-get pool-counter)
    }
)

;; @desc Toggle pool active status (owner only)
;; @param pool-id: The pool ID to toggle
;; @returns: Success response
(define-public (toggle-pool-status (pool-id uint))
    (let ((pool (unwrap! (map-get? staking-pools pool-id) ERR-POOL-NOT-FOUND)))
        
        (asserts! (is-eq tx-sender (var-get staking-owner)) ERR-UNAUTHORIZED)
        
        (let ((new-status (not (get active pool))))
            (map-set staking-pools pool-id (merge pool {active: new-status}))
            
            (print {
                event: "pool-status-toggled",
                pool-id: pool-id,
                new-status: new-status,
                updated-by: tx-sender
            })
            
            (ok new-status)
        )
    )
)