;; Staking Contract for Stacks Blockchain
;; This contract allows users to stake STX tokens and earn rewards

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-enough-balance (err u101))
(define-constant err-no-stake (err u102))
(define-constant err-already-staked (err u103))
(define-constant err-minimum-stake (err u104))
(define-constant err-reward-pool-empty (err u105))

;; Minimum stake amount (1 STX = 1,000,000 micro-STX)
(define-constant minimum-stake u1000000)
;; Data Variables
(define-data-var total-staked uint u0)
(define-data-var reward-pool uint u0)
(define-data-var annual-reward-rate uint u1000) ;; 10% = 1000 basis points
;; Data Maps
(define-map stakes
  principal
  {
    amount: uint,
    stake-block: uint,
    last-claim-block: uint
  }
)

(define-map user-rewards
  principal
  uint
)
;; Read-only functions

(define-read-only (get-stake (user principal))
  (map-get? stakes user)
)

(define-read-only (get-total-staked)
  (var-get total-staked)
)

(define-read-only (get-reward-pool)
  (var-get reward-pool)
)

(define-read-only (get-annual-reward-rate)
  (var-get annual-reward-rate)
)
(define-read-only (calculate-pending-rewards (user principal))
  (match (map-get? stakes user)
    stake-info
      (let
        (
          (blocks-staked (- block-height (get last-claim-block stake-info)))
          (stake-amount (get amount stake-info))
          ;; Approximate blocks per year on Stacks (assuming ~10 min per block)
          (blocks-per-year u52560)
          ;; Calculate rewards: (amount * rate * blocks) / (10000 * blocks-per-year)
          (rewards (/ (* (* stake-amount (var-get annual-reward-rate)) blocks-staked) 
                     (* u10000 blocks-per-year)))
        )
        (ok rewards)
      )
    (ok u0)
  )
)
;; Public functions

(define-public (stake (amount uint))
  (let
    (
      (sender tx-sender)
      (existing-stake (map-get? stakes sender))
    )
    (asserts! (>= amount minimum-stake) err-minimum-stake)
    (asserts! (is-none existing-stake) err-already-staked)
    
    ;; Transfer STX from user to contract
    (try! (stx-transfer? amount sender (as-contract tx-sender)))
    
    ;; Record the stake
    (map-set stakes sender {
      amount: amount,
      stake-block: block-height,
      last-claim-block: block-height
    })
    
    ;; Update total staked
    (var-set total-staked (+ (var-get total-staked) amount))
    
    (ok true)
  )
)
(define-public (add-to-stake (additional-amount uint))
  (let
    (
      (sender tx-sender)
      (stake-info (unwrap! (map-get? stakes sender) err-no-stake))
    )
    (asserts! (> additional-amount u0) err-not-enough-balance)
    
    ;; Claim any pending rewards first
    (try! (claim-rewards))
    
    ;; Transfer additional STX from user to contract
    (try! (stx-transfer? additional-amount sender (as-contract tx-sender)))
    
    ;; Update the stake
    (map-set stakes sender {
      amount: (+ (get amount stake-info) additional-amount),
      stake-block: (get stake-block stake-info),
      last-claim-block: block-height
    })
    
    ;; Update total staked
    (var-set total-staked (+ (var-get total-staked) additional-amount))
    
    (ok true)
  )
)

(define-public (claim-rewards)
  (let
    (
      (sender tx-sender)
      (stake-info (unwrap! (map-get? stakes sender) err-no-stake))
      (pending-rewards (unwrap! (calculate-pending-rewards sender) err-no-stake))
    )
    (asserts! (> pending-rewards u0) (ok u0))
    (asserts! (>= (var-get reward-pool) pending-rewards) err-reward-pool-empty)
    
    ;; Transfer rewards from contract to user
    (try! (as-contract (stx-transfer? pending-rewards tx-sender sender)))
    
    ;; Update reward pool
    (var-set reward-pool (- (var-get reward-pool) pending-rewards))
    
    ;; Update last claim block
    (map-set stakes sender (merge stake-info {
      last-claim-block: block-height
    }))
    
    (ok pending-rewards)
  )
)
(define-public (unstake)
  (let
    (
      (sender tx-sender)
      (stake-info (unwrap! (map-get? stakes sender) err-no-stake))
      (stake-amount (get amount stake-info))
    )
    ;; Claim any pending rewards first
    (try! (claim-rewards))
    
    ;; Transfer staked STX back to user
    (try! (as-contract (stx-transfer? stake-amount tx-sender sender)))
    
    ;; Remove the stake
    (map-delete stakes sender)
    
    ;; Update total staked
    (var-set total-staked (- (var-get total-staked) stake-amount))
    
    (ok stake-amount)
  )
)
;; Owner-only functions

(define-public (fund-reward-pool (amount uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    
    ;; Transfer STX from owner to contract
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    
    ;; Update reward pool
    (var-set reward-pool (+ (var-get reward-pool) amount))
    
    (ok true)
  )
)

(define-public (set-reward-rate (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (var-set annual-reward-rate new-rate)
    (ok true)
  )
)