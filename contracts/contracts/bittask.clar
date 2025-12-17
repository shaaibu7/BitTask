;; BitTask: Decentralized Microgigs Marketplace
;; Contract for managing tasks, escrow, and payments.

;; Constants
(define-constant ERR-ZERO-AMOUNT (err u100))
(define-constant ERR-INVALID-ID (err u101))
(define-constant ERR-UNAUTHORIZED (err u102))
(define-constant ERR-PAST-DEADLINE (err u103))
(define-constant ERR-EMPTY-TITLE (err u104))
(define-constant ERR-EMPTY-DESCRIPTION (err u105))
(define-constant ERR-CREATOR-CANNOT-ACCEPT (err u106))
(define-constant ERR-NOT-OPEN (err u107))
(define-constant ERR-NOT-IN-PROGRESS (err u108))
(define-constant ERR-NOT-WORKER (err u109))

;; Data Vars
(define-data-var task-nonce uint u0)

;; Data Maps
(define-map Tasks
    uint
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
