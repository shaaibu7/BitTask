;; Multi-Token Governance Contract
;; Enables token-based voting and governance
;; Version 1.0

;; Constants
(define-constant ERR-UNAUTHORIZED (err u801))
(define-constant ERR-PROPOSAL-NOT-FOUND (err u802))
(define-constant ERR-VOTING-ENDED (err u803))
(define-constant ERR-ALREADY-VOTED (err u804))
(define-constant ERR-INSUFFICIENT-TOKENS (err u805))
(define-constant ERR-PROPOSAL-ACTIVE (err u806))
(define-constant ERR-INVALID-DURATION (err u807))

;; Governance settings
(define-data-var governance-owner principal tx-sender)
(define-data-var min-proposal-tokens uint u1000) ;; Minimum tokens to create proposal
(define-data-var voting-duration uint u1440) ;; Default voting duration in blocks (~10 days)
(define-data-var quorum-threshold uint u10) ;; Minimum participation percentage

;; Proposal counter
(define-data-var proposal-counter uint u0)

;; Governance token settings
(define-data-var governance-token-contract principal tx-sender)
(define-data-var governance-token-id uint u1)

;; Proposals
(define-map proposals
    uint ;; proposal-id
    {
        proposer: principal,
        title: (string-ascii 128),
        description: (string-ascii 512),
        voting-starts: uint,
        voting-ends: uint,
        votes-for: uint,
        votes-against: uint,
        total-votes: uint,
        status: (string-ascii 16), ;; "active", "passed", "failed", "executed"
        created-at: uint,
        executed-at: (optional uint)
    }
)

;; Votes
(define-map votes
    {proposal-id: uint, voter: principal}
    {
        vote: bool, ;; true = for, false = against
        tokens: uint,
        voted-at: uint
    }
)

;; Proposal voters
(define-map proposal-voters uint (list 200 principal))

;; User proposals
(define-map user-proposals principal (list 50 uint))

;; @desc Create a new governance proposal
;; @param title: Proposal title
;; @param description: Proposal description
;; @param voting-duration-blocks: Duration of voting period
;; @returns: Proposal ID
(define-public (create-proposal 
    (title (string-ascii 128))
    (description (string-ascii 512))
    (voting-duration-blocks uint))
    (let ((proposal-id (+ (var-get proposal-counter) u1))
          (voting-starts (+ stacks-block-height u144)) ;; Start voting in ~1 day
          (voting-ends (+ voting-starts voting-duration-blocks)))
        
        ;; Validate inputs
        (asserts! (> (len title) u0) ERR-UNAUTHORIZED)
        (asserts! (> (len description) u0) ERR-UNAUTHORIZED)
        (asserts! (> voting-duration-blocks u0) ERR-INVALID-DURATION)
        
        ;; TODO: Check proposer has minimum governance tokens
        ;; This would require calling the governance token contract
        
        ;; Update counter
        (var-set proposal-counter proposal-id)
        
        ;; Create proposal
        (map-set proposals proposal-id {
            proposer: tx-sender,
            title: title,
            description: description,
            voting-starts: voting-starts,
            voting-ends: voting-ends,
            votes-for: u0,
            votes-against: u0,
            total-votes: u0,
            status: "active",
            created-at: stacks-block-height,
            executed-at: none
        })
        
        ;; Add to user proposals
        (let ((user-proposal-list (default-to (list) (map-get? user-proposals tx-sender))))
            (map-set user-proposals tx-sender
                (unwrap-panic (as-max-len? (append user-proposal-list proposal-id) u50)))
        )
        
        ;; Emit proposal creation event
        (print {
            event: "proposal-created",
            proposal-id: proposal-id,
            proposer: tx-sender,
            title: title,
            voting-starts: voting-starts,
            voting-ends: voting-ends
        })
        
        (ok proposal-id)
    )
)

;; @desc Vote on a proposal
;; @param proposal-id: The proposal to vote on
;; @param vote: True for yes, false for no
;; @param tokens: Number of governance tokens to use for voting
;; @returns: Success response
(define-public (vote-on-proposal (proposal-id uint) (vote bool) (tokens uint))
    (let ((proposal (unwrap! (map-get? proposals proposal-id) ERR-PROPOSAL-NOT-FOUND)))
        
        ;; Check voting is active
        (asserts! (is-eq (get status proposal) "active") ERR-PROPOSAL-ACTIVE)
        (asserts! (>= stacks-block-height (get voting-starts proposal)) ERR-VOTING-ENDED)
        (asserts! (< stacks-block-height (get voting-ends proposal)) ERR-VOTING-ENDED)
        
        ;; Check user hasn't voted
        (asserts! (is-none (map-get? votes {proposal-id: proposal-id, voter: tx-sender})) ERR-ALREADY-VOTED)
        
        ;; Validate token amount
        (asserts! (> tokens u0) ERR-INSUFFICIENT-TOKENS)
        
        ;; TODO: Check user has sufficient governance tokens
        ;; This would require calling the governance token contract
        
        ;; Record vote
        (map-set votes {proposal-id: proposal-id, voter: tx-sender} {
            vote: vote,
            tokens: tokens,
            voted-at: stacks-block-height
        })
        
        ;; Update proposal vote counts
        (let ((new-votes-for (if vote (+ (get votes-for proposal) tokens) (get votes-for proposal)))
              (new-votes-against (if vote (get votes-against proposal) (+ (get votes-against proposal) tokens)))
              (new-total-votes (+ (get total-votes proposal) tokens)))
            
            (map-set proposals proposal-id
                (merge proposal {
                    votes-for: new-votes-for,
                    votes-against: new-votes-against,
                    total-votes: new-total-votes
                }))
        )
        
        ;; Add voter to proposal voters
        (let ((current-voters (default-to (list) (map-get? proposal-voters proposal-id))))
            (map-set proposal-voters proposal-id
                (unwrap-panic (as-max-len? (append current-voters tx-sender) u200)))
        )
        
        ;; Emit vote event
        (print {
            event: "vote-cast",
            proposal-id: proposal-id,
            voter: tx-sender,
            vote: vote,
            tokens: tokens,
            voted-at: stacks-block-height
        })
        
        (ok true)
    )
)

;; @desc Finalize a proposal after voting ends
;; @param proposal-id: The proposal to finalize
;; @returns: Success response
(define-public (finalize-proposal (proposal-id uint))
    (let ((proposal (unwrap! (map-get? proposals proposal-id) ERR-PROPOSAL-NOT-FOUND)))
        
        ;; Check voting has ended
        (asserts! (>= stacks-block-height (get voting-ends proposal)) ERR-VOTING-ENDED)
        (asserts! (is-eq (get status proposal) "active") ERR-PROPOSAL-ACTIVE)
        
        ;; Calculate results
        (let ((votes-for (get votes-for proposal))
              (votes-against (get votes-against proposal))
              (total-votes (get total-votes proposal))
              (quorum-met (>= total-votes (var-get min-proposal-tokens))) ;; Simplified quorum check
              (proposal-passed (and quorum-met (> votes-for votes-against))))
            
            ;; Update proposal status
            (map-set proposals proposal-id
                (merge proposal {
                    status: (if proposal-passed "passed" "failed")
                }))
            
            ;; Emit finalization event
            (print {
                event: "proposal-finalized",
                proposal-id: proposal-id,
                passed: proposal-passed,
                votes-for: votes-for,
                votes-against: votes-against,
                total-votes: total-votes,
                quorum-met: quorum-met
            })
            
            (ok proposal-passed)
        )
    )
)

;; @desc Execute a passed proposal (governance owner only)
;; @param proposal-id: The proposal to execute
;; @returns: Success response
(define-public (execute-proposal (proposal-id uint))
    (let ((proposal (unwrap! (map-get? proposals proposal-id) ERR-PROPOSAL-NOT-FOUND)))
        
        ;; Only governance owner can execute
        (asserts! (is-eq tx-sender (var-get governance-owner)) ERR-UNAUTHORIZED)
        
        ;; Check proposal passed
        (asserts! (is-eq (get status proposal) "passed") ERR-PROPOSAL-ACTIVE)
        
        ;; TODO: Execute proposal actions
        ;; This would contain the actual governance actions
        
        ;; Update proposal status
        (map-set proposals proposal-id
            (merge proposal {
                status: "executed",
                executed-at: (some stacks-block-height)
            }))
        
        ;; Emit execution event
        (print {
            event: "proposal-executed",
            proposal-id: proposal-id,
            executed-by: tx-sender,
            executed-at: stacks-block-height
        })
        
        (ok true)
    )
)

;; @desc Get proposal information
;; @param proposal-id: The proposal ID to query
;; @returns: Proposal information or none
(define-read-only (get-proposal (proposal-id uint))
    (map-get? proposals proposal-id)
)

;; @desc Get user's vote on a proposal
;; @param proposal-id: The proposal ID
;; @param voter: The voter address
;; @returns: Vote information or none
(define-read-only (get-vote (proposal-id uint) (voter principal))
    (map-get? votes {proposal-id: proposal-id, voter: voter})
)

;; @desc Get proposals created by a user
;; @param user: The user address
;; @returns: List of proposal IDs
(define-read-only (get-user-proposals (user principal))
    (default-to (list) (map-get? user-proposals user))
)

;; @desc Get voters for a proposal
;; @param proposal-id: The proposal ID
;; @returns: List of voter addresses
(define-read-only (get-proposal-voters (proposal-id uint))
    (default-to (list) (map-get? proposal-voters proposal-id))
)

;; @desc Check if voting is active for a proposal
;; @param proposal-id: The proposal ID
;; @returns: True if voting is active
(define-read-only (is-voting-active (proposal-id uint))
    (match (map-get? proposals proposal-id)
        proposal (and 
            (is-eq (get status proposal) "active")
            (>= stacks-block-height (get voting-starts proposal))
            (< stacks-block-height (get voting-ends proposal))
        )
        false
    )
)

;; @desc Get governance statistics
;; @returns: Governance statistics
(define-read-only (get-governance-stats)
    {
        owner: (var-get governance-owner),
        total-proposals: (var-get proposal-counter),
        min-proposal-tokens: (var-get min-proposal-tokens),
        voting-duration: (var-get voting-duration),
        quorum-threshold: (var-get quorum-threshold),
        governance-token-contract: (var-get governance-token-contract),
        governance-token-id: (var-get governance-token-id)
    }
)

;; @desc Update governance settings (owner only)
;; @param new-min-tokens: New minimum tokens for proposals
;; @param new-voting-duration: New default voting duration
;; @param new-quorum: New quorum threshold
;; @returns: Success response
(define-public (update-governance-settings 
    (new-min-tokens uint)
    (new-voting-duration uint)
    (new-quorum uint))
    (begin
        (asserts! (is-eq tx-sender (var-get governance-owner)) ERR-UNAUTHORIZED)
        
        (var-set min-proposal-tokens new-min-tokens)
        (var-set voting-duration new-voting-duration)
        (var-set quorum-threshold new-quorum)
        
        (print {
            event: "governance-settings-updated",
            min-tokens: new-min-tokens,
            voting-duration: new-voting-duration,
            quorum: new-quorum,
            updated-by: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Set governance token (owner only)
;; @param token-contract: The governance token contract
;; @param token-id: The governance token ID
;; @returns: Success response
(define-public (set-governance-token (token-contract principal) (token-id uint))
    (begin
        (asserts! (is-eq tx-sender (var-get governance-owner)) ERR-UNAUTHORIZED)
        
        (var-set governance-token-contract token-contract)
        (var-set governance-token-id token-id)
        
        (print {
            event: "governance-token-updated",
            token-contract: token-contract,
            token-id: token-id,
            updated-by: tx-sender
        })
        
        (ok true)
    )
)