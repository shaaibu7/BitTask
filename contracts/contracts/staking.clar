;; Staking Contract for BitTask (BTK)
;; Version: 1.0.0
;; Implements weighted staking rewards

;; Constants
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INSUFFICIENT-BALANCE (err u101))
(define-constant ERR-STAKE-NOT-FOUND (err u102))
(define-constant ERR-COOLDOWN-ACTIVE (err u103))
(define-constant REWARD-RATE-BASIS u100) ;; 1% per block/period base
(define-constant MIN-STAKE-DURATION u144) ;; ~24 hours in Stacks blocks

;; Data Maps
(define-map Stakes 
    principal 
    {
        amount: uint,
        last-stake-block: uint,
        accumulated-rewards: uint,
        multiplier: uint
    }
)

;; Public Functions

;; @desc Stake BTK tokens to earn rewards
;; @param amount: The amount of BTK tokens to stake
(define-public (stake (amount uint))
    (let (
        (user tx-sender)
        (current-stake (default-to { amount: u0, last-stake-block: block-height, accumulated-rewards: u0, multiplier: u100 } (map-get? Stakes user)))
        (new-amount (+ amount (get amount current-stake)))
    )
        ;; Transfer tokens from user to contract
        ;; (contract-call? .bit-token transfer amount user (as-contract tx-sender) none)
        ;; Note: Actual transfer logic commented out until bit-token is fully integrated or using mock
        
        (asserts! (> amount u0) ERR-INSUFFICIENT-BALANCE)
        
        (map-set Stakes user {
            amount: new-amount,
            last-stake-block: block-height,
            accumulated-rewards: (get accumulated-rewards current-stake),
            multiplier: (calculate-multiplier new-amount)
        })
        
        (print { action: "stake", user: user, amount: amount, total: new-amount })
        (ok true)
    )
)

;; @desc Unstake tokens and claim rewards
(define-public (unstake)
    (let (
        (user tx-sender)
        (stake-info (unwrap! (map-get? Stakes user) ERR-STAKE-NOT-FOUND))
        (time-elapsed (- block-height (get last-stake-block stake-info)))
    )
        (asserts! (>= time-elapsed MIN-STAKE-DURATION) ERR-COOLDOWN-ACTIVE)
        
        ;; Calculate final rewards
        (let ((rewards (calculate-rewards (get amount stake-info) time-elapsed (get multiplier stake-info))))
            ;; Transfer logic here
            (map-delete Stakes user)
            (print { action: "unstake", user: user, rewards: rewards })
            (ok rewards)
        )
    )
)

;; Private Functions

(define-read-only (calculate-multiplier (amount uint))
    (if (> amount u1000000)
        u150 ;; 1.5x for whales
        (if (> amount u100000)
            u120 ;; 1.2x
            u100 ;; 1.0x base
        )
    )
)

(define-read-only (calculate-rewards (amount uint) (blocks uint) (multiplier uint))
    (/ (* (* amount blocks) multiplier) (* u10000 REWARD-RATE-BASIS))
)

;; Read-only functions

(define-read-only (get-stake-info (user principal))
    (map-get? Stakes user)
)
