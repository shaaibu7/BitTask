;; Governance DAO Contract for BitTask
;; Version: 1.0.0
;; Implements on-chain voting and proposal management

;; Constants
(define-constant ERR-NOT-AUTHORIZED (err u200))
(define-constant ERR-PROPOSAL-NOT-FOUND (err u201))
(define-constant ERR-VOTING-CLOSED (err u202))
(define-constant ERR-ALREADY-VOTED (err u203))
(define-constant ERR-INSUFFICIENT-VOTING-POWER (err u204))

(define-constant VOTING-DURATION u1008) ;; ~1 week in Stacks blocks
(define-constant MIN-PROPOSAL-THRESHOLD u100000) ;; Min tokens to propose

;; Data Vars
(define-data-var proposal-count uint u0)

;; Data Maps
(define-map Proposals 
    uint 
    {
        creator: principal,
        title: (string-ascii 50),
        description: (string-ascii 200),
        start-block: uint,
        end-block: uint,
        votes-for: uint,
        votes-against: uint,
        status: (string-ascii 12) ;; "pending", "active", "passed", "failed"
    }
)

(define-map Votes
    { proposal-id: uint, voter: principal }
    { amount: uint, support: bool }
)

;; Public Functions

;; @desc Create a new governance proposal
(define-public (create-proposal (title (string-ascii 50)) (description (string-ascii 200)))
    (let (
        (id (+ (var-get proposal-count) u1))
        ;; (voting-power (contract-call? .bit-token get-balance tx-sender))
    )
        ;; (asserts! (>= voting-power MIN-PROPOSAL-THRESHOLD) ERR-INSUFFICIENT-VOTING-POWER)
        
        (map-set Proposals id {
            creator: tx-sender,
            title: title,
            description: description,
            start-block: block-height,
            end-block: (+ block-height VOTING-DURATION),
            votes-for: u0,
            votes-against: u0,
            status: "active"
        })
        
        (var-set proposal-count id)
        (print { action: "create-proposal", id: id, creator: tx-sender })
        (ok id)
    )
)

;; @desc Vote on an active proposal
(define-public (vote (proposal-id uint) (support bool) (amount uint))
    (let (
        (proposal (unwrap! (map-get? Proposals proposal-id) ERR-PROPOSAL-NOT-FOUND))
        (voter tx-sender)
    )
        (asserts! (< block-height (get end-block proposal)) ERR-VOTING-CLOSED)
        (asserts! (is-none (map-get? Votes { proposal-id: proposal-id, voter: voter })) ERR-ALREADY-VOTED)
        
        ;; Update proposal totals
        (map-set Proposals proposal-id 
            (if support
                (merge proposal { votes-for: (+ (get votes-for proposal) amount) })
                (merge proposal { votes-against: (+ (get votes-against proposal) amount) })
            )
        )
        
        (map-set Votes { proposal-id: proposal-id, voter: voter } { amount: amount, support: support })
        
        (print { action: "vote", proposal-id: proposal-id, voter: voter, support: support })
        (ok true)
    )
)

;; Read-only Functions

(define-read-only (get-proposal (id uint))
    (map-get? Proposals id)
)

(define-read-only (get-vote (id uint) (voter principal))
    (map-get? Votes { proposal-id: id, voter: voter })
)

(define-read-only (get-total-proposals)
    (var-get proposal-count)
)
