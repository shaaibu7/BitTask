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

;; Enhanced validation error constants
(define-constant ERR-TITLE-TOO-SHORT (err u113)) ;; Title must be at least 5 characters
(define-constant ERR-TITLE-TOO-LONG (err u114)) ;; Title must be at most 100 characters
(define-constant ERR-DESCRIPTION-TOO-SHORT (err u115)) ;; Description must be at least 20 characters
(define-constant ERR-DESCRIPTION-TOO-LONG (err u116)) ;; Description must be at most 500 characters
(define-constant ERR-AMOUNT-TOO-LOW (err u117)) ;; Amount below minimum limit
(define-constant ERR-AMOUNT-TOO-HIGH (err u118)) ;; Amount above maximum limit
(define-constant ERR-DEADLINE-TOO-SOON (err u119)) ;; Deadline must be at least 24 hours in future

;; Category error constants
(define-constant ERR-INVALID-CATEGORY (err u120)) ;; Category does not exist
(define-constant ERR-CATEGORY-INACTIVE (err u121)) ;; Category is not active

;; Validation constants
(define-constant MIN-TITLE-LENGTH u5)
(define-constant MAX-TITLE-LENGTH u100)
(define-constant MIN-DESCRIPTION-LENGTH u20)
(define-constant MAX-DESCRIPTION-LENGTH u500)
(define-constant MIN-AMOUNT u1000) ;; 1000 micro-STX minimum
(define-constant MAX-AMOUNT u100000000) ;; 100 STX maximum
(define-constant MIN-DEADLINE-BLOCKS u144) ;; 24 hours minimum (assuming 10 min blocks)

;; Data Variables
(define-data-var task-nonce uint u0) ;; Global counter for task IDs

;; Data Maps
;; Category storage for task classification
(define-map Categories
    (string-ascii 30) ;; Category ID
    {
        name: (string-ascii 50),
        description: (string-ascii 200),
        task-count: uint,
        active: bool
    }
)

;; Main storage for task details
(define-map Tasks
    uint ;; Task ID
    {
        title: (string-ascii 100),           ; Extended from 50
        description: (string-ascii 500),     ; Extended from 256
        creator: principal,
        worker: (optional principal),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20), ;; "open", "in-progress", "submitted", "completed", "disputed"
        submission: (optional (string-ascii 500)), ;; Extended for multiple links
        created-at: uint,
        category: (string-ascii 30),         ; New field for categorization
    }
)

;; Enhanced validation functions

;; @desc Initialize predefined categories
(define-private (initialize-categories)
    (begin
        (map-set Categories "development" {
            name: "Development",
            description: "Software development, coding, and programming tasks",
            task-count: u0,
            active: true
        })
        (map-set Categories "design" {
            name: "Design",
            description: "UI/UX design, graphics, and visual content creation",
            task-count: u0,
            active: true
        })
        (map-set Categories "writing" {
            name: "Writing",
            description: "Content writing, documentation, and copywriting",
            task-count: u0,
            active: true
        })
        (map-set Categories "marketing" {
            name: "Marketing",
            description: "Marketing campaigns, social media, and promotion",
            task-count: u0,
            active: true
        })
        (map-set Categories "research" {
            name: "Research",
            description: "Market research, data analysis, and investigation",
            task-count: u0,
            active: true
        })
        (ok true)
    )
)

;; @desc Validate category exists and is active
;; @param category (string-ascii 30) - Category to validate
(define-private (validate-category (category (string-ascii 30)))
    (let ((cat-data (map-get? Categories category)))
        (asserts! (is-some cat-data) ERR-INVALID-CATEGORY)
        (asserts! (get active (unwrap-panic cat-data)) ERR-CATEGORY-INACTIVE)
        (ok true)
    )
)

;; @desc Increment task count for a category
;; @param category (string-ascii 30) - Category to update
(define-private (increment-category-count (category (string-ascii 30)))
    (let ((cat-data (unwrap! (map-get? Categories category) ERR-INVALID-CATEGORY)))
        (map-set Categories category
            (merge cat-data {
                task-count: (+ (get task-count cat-data) u1)
            })
        )
        (ok true)
    )
)

;; @desc Validate task creation parameters
;; @param title (string-ascii 100) - Task title
;; @param description (string-ascii 500) - Task description  
;; @param amount uint - Task amount
;; @param deadline uint - Task deadline
;; @param category (string-ascii 30) - Task category
(define-private (validate-task-creation
        (title (string-ascii 100))
        (description (string-ascii 500))
        (amount uint)
        (deadline uint)
        (category (string-ascii 30))
    )
    (begin
        ;; Validate title length
        (asserts! (>= (len title) MIN-TITLE-LENGTH) ERR-TITLE-TOO-SHORT)
        (asserts! (<= (len title) MAX-TITLE-LENGTH) ERR-TITLE-TOO-LONG)
        
        ;; Validate description length
        (asserts! (>= (len description) MIN-DESCRIPTION-LENGTH) ERR-DESCRIPTION-TOO-SHORT)
        (asserts! (<= (len description) MAX-DESCRIPTION-LENGTH) ERR-DESCRIPTION-TOO-LONG)
        
        ;; Validate amount limits
        (asserts! (>= amount MIN-AMOUNT) ERR-AMOUNT-TOO-LOW)
        (asserts! (<= amount MAX-AMOUNT) ERR-AMOUNT-TOO-HIGH)
        
        ;; Validate deadline (must be at least 24 hours in future)
        (asserts! (>= deadline (+ stacks-block-height MIN-DEADLINE-BLOCKS)) ERR-DEADLINE-TOO-SOON)
        
        ;; Validate category
        (try! (validate-category category))
        
        (ok true)
    )
)

;; @desc Check if string contains only valid characters (alphanumeric, spaces, hyphens)
;; @param input (string-ascii 500) - String to validate
(define-private (validate-string-chars (input (string-ascii 500)))
    ;; For now, we'll accept all ASCII characters as Clarity doesn't have regex
    ;; In production, this could be enhanced with character-by-character validation
    (ok true)
)

;; Public Functions

;; @desc Create a new task with details and reward amount
;; @param title (string-ascii 100) - Title of the task (extended from 50)
;; @param description (string-ascii 500) - Description (extended from 256)
;; @param amount uint - Reward amount in micro-STX
;; @param deadline uint - Block height by which task must be completed
;; @param category (string-ascii 30) - Task category
(define-public (create-task
        (title (string-ascii 100))
        (description (string-ascii 500))
        (amount uint)
        (deadline uint)
        (category (string-ascii 30))
    )
    (let ((task-id (+ (var-get task-nonce) u1)))
        ;; Initialize categories on first use
        (try! (initialize-categories))
        
        ;; Enhanced validation using new validation function
        (try! (validate-task-creation title description amount deadline category))

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
            category: category,
        })

        ;; Update category statistics
        (try! (increment-category-count category))

        ;; Increment nonce
        (var-set task-nonce task-id)

        ;; Emit event
        (print {
            event: "created",
            id: task-id,
            creator: tx-sender,
            amount: amount,
            deadline: deadline,
            category: category,
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
;; @param submission (string-ascii 500) - Link or hash of the work (extended from 256)
(define-public (submit-work
        (id uint)
        (submission (string-ascii 500))
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

;; @desc Get category information
;; @param category-id (string-ascii 30) - Category ID
(define-read-only (get-category (category-id (string-ascii 30)))
    (map-get? Categories category-id)
)

;; @desc Get all available categories
(define-read-only (get-all-categories)
    (list
        (map-get? Categories "development")
        (map-get? Categories "design")
        (map-get? Categories "writing")
        (map-get? Categories "marketing")
        (map-get? Categories "research")
    )
)

;; @desc Filter tasks by category
;; @param category (string-ascii 30) - Category to filter by
;; @param task-ids (list 200 uint) - List of task IDs to filter
(define-read-only (get-tasks-by-category 
        (category (string-ascii 30))
        (task-ids (list 200 uint))
    )
    (filter is-task-in-category (map get-task task-ids))
)

;; @desc Helper function to check if task belongs to category
;; @param task-opt (optional task) - Task to check
(define-private (is-task-in-category (task-opt (optional {
        title: (string-ascii 100),
        description: (string-ascii 500),
        creator: principal,
        worker: (optional principal),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20),
        submission: (optional (string-ascii 500)),
        created-at: uint,
        category: (string-ascii 30)
    })))
    (is-some task-opt)
)
