;; BitTask: Decentralized Microgigs Marketplace
;; Contract for managing tasks, escrow, and payments.

;; Constants
;; Error Constants
(define-constant ERR-ZERO-AMOUNT (err u100)) ;; Amount must be greater than 0
(define-constant ERR-INVALID-ID (err u101)) ;; Task ID not found
(define-constant ERR-UNAUTHORIZED (err u102)) ;; Caller is not authorized
(define-constant ERR-PAST-DEADLINE (err u103)) ;; Deadline has passed
(define-constant ERR-EMPTY-TITLE (err u104)) ;; Title cannot be empty
(define-constant ERR-EMPTY-DESCRIPTION (err u105)) ;; Description cannot be empty
(define-constant ERR-CREATOR-CANNOT-ACCEPT (err u106)) ;; Creator cannot accept their own task
(define-constant ERR-NOT-OPEN (err u107)) ;; Task status is not 'open'
(define-constant ERR-NOT-IN-PROGRESS (err u108)) ;; Task status is not 'in-progress'
(define-constant ERR-NOT-WORKER (err u109)) ;; Caller is not the assigned worker
(define-constant ERR-NOT-SUBMITTED (err u110)) ;; Task has not been submitted
(define-constant ERR-NOT-CREATOR (err u111)) ;; Caller is not the task creator
(define-constant ERR-ALREADY-COMPLETED (err u112)) ;; Task is already completed
(define-constant ERR-INVALID-MILESTONE (err u113)) ;; Milestone ID not found or invalid
(define-constant ERR-MILESTONE-ALREADY-APPROVED (err u114)) ;; Milestone already approved

;; Data Variables
(define-data-var task-nonce uint u0) ;; Global counter for task IDs

;; Data Maps
;; Main storage for task details
(define-map Tasks
    uint ;; Task ID
    {
        title: (string-ascii 50),
        description: (string-ascii 256),
        creator: principal,
        worker: (optional principal),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20), ;; "open", "in-progress", "submitted", "completed", "disputed"
        submission: (optional (string-ascii 256)), ;; Proof of work link/hash
        created-at: uint,
    }
)

;; Storage for task milestones
(define-map Milestones
    { task-id: uint, milestone-id: uint }
    {
        description: (string-ascii 128),
        amount: uint,
        status: (string-ascii 20), ;; "pending", "approved"
    }
)

;; Public Functions

;; @desc Create a new task with details and reward amount
;; @param title (string-ascii 50) - Title of the task
;; @param description (string-ascii 256) - Short description
;; @param amount uint - Reward amount in micro-STX
;; @param deadline uint - Block height by which task must be completed
(define-public (create-task
        (title (string-ascii 50))
        (description (string-ascii 256))
        (amount uint)
        (deadline uint)
    )
    (let ((task-id (+ (var-get task-nonce) u1)))
        ;; Check title is not empty
        (asserts! (> (len title) u0) ERR-EMPTY-TITLE)

        ;; Check description is not empty
        (asserts! (> (len description) u0) ERR-EMPTY-DESCRIPTION)

        ;; Check amount is positive
        (asserts! (> amount u0) ERR-ZERO-AMOUNT)

        ;; Check deadline is in future
        (asserts! (> deadline stacks-block-height) ERR-PAST-DEADLINE)

        ;; Transfer STX from creator to contract
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

        ;; Store task data
        (map-set Tasks task-id {
            title: title,
            description: description,
            creator: tx-sender,
            worker: none,
            amount: amount,
            deadline: deadline,
            status: "open",
            submission: none,
            created-at: stacks-block-height,
        })

        ;; Increment nonce
        (var-set task-nonce task-id)

        ;; Emit event
        (print {
            event: "created",
            id: task-id,
            creator: tx-sender,
            amount: amount,
            deadline: deadline,
        })

        (ok task-id)
    )
)

;; @desc Accept a task
;; @param id uint - Task ID
(define-public (accept-task (id uint))
    (let ((task (unwrap! (map-get? Tasks id) ERR-INVALID-ID)))
        ;; Check that sender is not the creator
        (asserts! (not (is-eq tx-sender (get creator task)))
            ERR-CREATOR-CANNOT-ACCEPT
        )

        ;; Check that status is open
        (asserts! (is-eq (get status task) "open") ERR-NOT-OPEN)

        ;; Update task
        (map-set Tasks id
            (merge task {
                worker: (some tx-sender),
                status: "in-progress",
            })
        )

        ;; Emit event
        (print {
            event: "accepted",
            id: id,
            worker: tx-sender,
        })

        (ok true)
    )
)

;; @desc Submit work for a task
;; @param id uint - Task ID
;; @param submission (string-ascii 256) - Link or hash of the work
(define-public (submit-work
        (id uint)
        (submission (string-ascii 256))
    )
    (let ((task (unwrap! (map-get? Tasks id) ERR-INVALID-ID)))
        ;; Check status is in-progress
        (asserts! (is-eq (get status task) "in-progress") ERR-NOT-IN-PROGRESS)

        ;; Check sender is the worker
        (asserts! (is-eq (some tx-sender) (get worker task)) ERR-NOT-WORKER)

        ;; Update task
        (map-set Tasks id
            (merge task {
                status: "submitted",
                submission: (some submission),
            })
        )

        ;; Emit event
        (print {
            event: "submitted",
            id: id,
            worker: tx-sender,
            submission: submission,
        })

        (ok true)
    )
)

;; @desc Approve work and release payment to worker
;; @param id uint - Task ID
(define-public (approve-work (id uint))
    (let ((task (unwrap! (map-get? Tasks id) ERR-INVALID-ID)))
        ;; Check that sender is the creator
        (asserts! (is-eq tx-sender (get creator task)) ERR-NOT-CREATOR)

        ;; Check that status is submitted
        (asserts! (is-eq (get status task) "submitted") ERR-NOT-SUBMITTED)

        ;; Get worker principal
        (let ((worker-principal (unwrap! (get worker task) ERR-NOT-WORKER)))
            ;; Update task status before transfer to prevent re-entrancy attacks
            ;; Following Checks-Effects-Interactions pattern: update state (Effect) before external call (Interaction)
            (map-set Tasks id
                (merge task {
                    status: "completed",
                })
            )

            ;; Transfer STX from contract to worker
            ;; If transfer fails, entire transaction (including state change) will be reverted
            (try! (as-contract (stx-transfer? (get amount task) tx-sender worker-principal)))

            ;; Emit event
            (print {
                event: "approved",
                id: id,
                creator: tx-sender,
                worker: worker-principal,
                amount: (get amount task),
            })

            (ok true)
        )
    )
)

;; @desc Reject submitted work and refund to creator
;; @param id uint - Task ID
(define-public (reject-work (id uint))
    (let ((task (unwrap! (map-get? Tasks id) ERR-INVALID-ID)))
        ;; Check that sender is the creator
        (asserts! (is-eq tx-sender (get creator task)) ERR-NOT-CREATOR)

        ;; Check that status is submitted
        (asserts! (is-eq (get status task) "submitted") ERR-NOT-SUBMITTED)

        ;; Update task status to open (allows creator to reclaim or reassign)
        (map-set Tasks id
            (merge task {
                status: "open",
                worker: none,
                submission: none,
            })
        )

        ;; Refund STX from contract back to creator
        (try! (as-contract (stx-transfer? (get amount task) tx-sender (get creator task))))

        ;; Emit event
        (print {
            event: "rejected",
            id: id,
            creator: tx-sender,
            amount: (get amount task),
        })

        (ok true)
    )
)

;; @desc Reclaim funds from an expired task
;; @param id uint - Task ID
(define-public (reclaim-expired (id uint))
    (let ((task (unwrap! (map-get? Tasks id) ERR-INVALID-ID)))
        ;; Check that sender is the creator
        (asserts! (is-eq tx-sender (get creator task)) ERR-NOT-CREATOR)

        ;; Check that task is open (not assigned or expired before assignment)
        (asserts! (is-eq (get status task) "open") ERR-NOT-OPEN)

        ;; Check that deadline has passed
        (asserts! (<= (get deadline task) stacks-block-height) ERR-PAST-DEADLINE)

        ;; Update task status to completed (prevents further actions)
        (map-set Tasks id
            (merge task {
                status: "completed",
            })
        )

        ;; Refund STX from contract back to creator
        (try! (as-contract (stx-transfer? (get amount task) tx-sender (get creator task))))

        ;; Emit event
        (print {
            event: "reclaimed",
            id: id,
            creator: tx-sender,
            amount: (get amount task),
            reason: "expired",
        })

        (ok true)
    )
)

;; @desc Add a milestone to a task
;; @param task-id uint - Task ID
;; @param milestone-id uint - Milestone ID (sequential for task)
;; @param description (string-ascii 128) - Milestone description
;; @param amount uint - Micro-STX to be released upon completion
(define-public (add-milestone
        (task-id uint)
        (milestone-id uint)
        (description (string-ascii 128))
        (amount uint)
    )
    (let ((task (unwrap! (map-get? Tasks task-id) ERR-INVALID-ID)))
        ;; Check if sender is creator
        (asserts! (is-eq tx-sender (get creator task)) ERR-NOT-CREATOR)
        ;; Check if task is not completed
        (asserts! (not (is-eq (get status task) "completed")) ERR-ALREADY-COMPLETED)
        ;; Check amount is within total task amount (simplified for now)
        ;; In a full implementation, we'd track remaining balance
        
        (map-set Milestones { task-id: task-id, milestone-id: milestone-id }
            {
                description: description,
                amount: amount,
                status: "pending"
            }
        )
        (ok true)
    )
)

;; @desc Approve a milestone and release partial payment
;; @param task-id uint - Task ID
;; @param milestone-id uint - Milestone ID
(define-public (approve-milestone (task-id uint) (milestone-id uint))
    (let ((task (unwrap! (map-get? Tasks task-id) ERR-INVALID-ID))
          (milestone (unwrap! (map-get? Milestones { task-id: task-id, milestone-id: milestone-id }) ERR-INVALID-MILESTONE)))
        
        ;; Check if sender is creator
        (asserts! (is-eq tx-sender (get creator task)) ERR-NOT-CREATOR)
        ;; Check if milestone is not already approved
        (asserts! (is-eq (get status milestone) "pending") ERR-MILESTONE-ALREADY-APPROVED)
        
        (let ((worker-principal (unwrap! (get worker task) ERR-NOT-WORKER)))
            ;; Update milestone status
            (map-set Milestones { task-id: task-id, milestone-id: milestone-id }
                (merge milestone { status: "approved" })
            )
            
            ;; Transfer milestone amount to worker
            (try! (as-contract (stx-transfer? (get amount milestone) tx-sender worker-principal)))
            
            (ok true)
        )
    )
)

;; Read-only functions

(define-read-only (get-task (id uint))
    (map-get? Tasks id)
)

(define-read-only (get-nonce)
    (var-get task-nonce)
)

(define-read-only (get-tasks (id-list (list 200 uint)))
    (map get-task id-list)
)
