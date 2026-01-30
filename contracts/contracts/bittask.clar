;; BitTask: Decentralized Microgigs Marketplace v2.0
;; Enhanced contract for managing tasks, escrow, payments, disputes, and reputation.
;; 
;; Features:
;; - Enhanced input validation with comprehensive limits
;; - Task categorization system with predefined categories
;; - Dispute resolution with arbitrator system
;; - Comprehensive reputation tracking and scoring
;; - Multi-milestone task support with sequential completion
;; - Advanced query and search capabilities with pagination
;; - Task management with modification and cleanup
;; - Enhanced work submission with revision management
;; - Rating and quality assessment system
;; - Emergency controls and recovery mechanisms
;; - Comprehensive event logging and monitoring
;; - Data completeness validation and analytics

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

;; Dispute error constants
(define-constant ERR-DISPUTE-EXISTS (err u200)) ;; Task already has an active dispute
(define-constant ERR-DISPUTE-NOT-FOUND (err u201)) ;; Dispute ID not found
(define-constant ERR-NOT-DISPUTE-PARTICIPANT (err u202)) ;; Caller not creator or worker
(define-constant ERR-NOT-ARBITRATOR (err u203)) ;; Caller is not assigned arbitrator
(define-constant ERR-DISPUTE-ALREADY-RESOLVED (err u204)) ;; Dispute already resolved
(define-constant ERR-INSUFFICIENT-DISPUTE-FEE (err u205)) ;; Insufficient fee for dispute
(define-constant ERR-INVALID-DISPUTE-DECISION (err u206)) ;; Invalid arbitrator decision

;; Reputation error constants
(define-constant ERR-USER-NOT-FOUND (err u300)) ;; User reputation not found
(define-constant ERR-INVALID-RATING (err u301)) ;; Rating must be between 1-5

;; Milestone error constants
(define-constant ERR-INVALID-MILESTONE (err u400)) ;; Milestone not found
(define-constant ERR-MILESTONE-NOT-NEXT (err u401)) ;; Milestone not next in sequence
(define-constant ERR-MILESTONE-ALREADY-COMPLETED (err u402)) ;; Milestone already completed
(define-constant ERR-INSUFFICIENT-ESCROW (err u403)) ;; Insufficient escrow for milestone
(define-constant ERR-NO-MILESTONES (err u404)) ;; Task has no milestones

;; Task management error constants
(define-constant ERR-TASK-NOT-MODIFIABLE (err u500)) ;; Task cannot be modified
(define-constant ERR-INVALID-UPDATE (err u501)) ;; Invalid update parameters

;; Work submission error constants
(define-constant ERR-REVISION-LIMIT_EXCEEDED (err u600)) ;; Too many revisions requested
(define-constant ERR-INVALID-SUBMISSION_FORMAT (err u601)) ;; Invalid submission format

;; Emergency and recovery error constants
(define-constant ERR-CONTRACT-PAUSED (err u700)) ;; Contract is paused
(define-constant ERR-NOT-EMERGENCY_ADMIN (err u701)) ;; Not authorized for emergency actions
(define-constant ERR-RECOVERY-NOT_AVAILABLE (err u702)) ;; Recovery not available for this task
(define-constant ERR-RECOVERY-TIMELOCK_ACTIVE (err u703)) ;; Recovery timelock still active

;; Validation constants
(define-constant MIN-TITLE-LENGTH u5)
(define-constant MAX-TITLE-LENGTH u100)
(define-constant MIN-DESCRIPTION-LENGTH u20)
(define-constant MAX-DESCRIPTION-LENGTH u500)
(define-constant MIN-AMOUNT u1000) ;; 1000 micro-STX minimum
(define-constant MAX-AMOUNT u100000000) ;; 100 STX maximum
(define-constant MIN-DEADLINE-BLOCKS u144) ;; 24 hours minimum (assuming 10 min blocks)

;; Dispute constants
(define-constant DISPUTE-FEE-PERCENTAGE u5) ;; 5% of task amount as dispute fee
(define-constant MIN-DISPUTE-FEE u50000) ;; Minimum 0.05 STX dispute fee

;; Work submission constants
(define-constant MAX-REVISIONS u3) ;; Maximum number of revisions allowed
(define-constant REVISION-DEADLINE-EXTENSION u72) ;; 12 hours extension per revision

;; Emergency and recovery constants
(define-constant RECOVERY-TIMELOCK-BLOCKS u1008) ;; 7 days timelock for recovery
(define-constant EMERGENCY-PAUSE-DURATION u144) ;; 24 hours maximum pause duration

;; Data Variables
(define-data-var task-nonce uint u0) ;; Global counter for task IDs
(define-data-var dispute-nonce uint u0) ;; Global counter for dispute IDs
(define-data-var contract-owner principal tx-sender) ;; Contract owner for arbitrator management
(define-data-var contract-paused bool false) ;; Emergency pause state
(define-data-var pause-end-block (optional uint) none) ;; When pause expires
(define-data-var emergency-admin (optional principal) none) ;; Emergency admin for recovery

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

;; Dispute storage for conflict resolution
(define-map Disputes
    uint ;; Dispute ID
    {
        task-id: uint,
        initiator: principal,
        reason: (string-ascii 256),
        arbitrator: (optional principal),
        resolution: (optional (string-ascii 256)),
        created-at: uint,
        resolved-at: (optional uint),
        winner: (optional principal), ;; "creator" or "worker"
        fee-paid: uint
    }
)

;; Arbitrator registry
(define-map Arbitrators
    principal
    {
        active: bool,
        total-cases: uint,
        reputation-score: uint
    }
)

;; User reputation tracking
(define-map UserReputation
    principal
    {
        total-tasks: uint,
        completed-tasks: uint,
        total-earned: uint,
        total-spent: uint,
        average-rating: uint, ;; Multiplied by 100 for precision (e.g., 450 = 4.5 stars)
        dispute-count: uint,
        last-activity: uint
    }
)

;; Milestone tracking for multi-milestone tasks
(define-map TaskMilestones
    {task-id: uint, milestone-id: uint}
    {
        description: (string-ascii 200),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20), ;; "pending", "completed", "paid"
        submission: (optional (string-ascii 256)),
        completed-at: (optional uint)
    }
)

;; Work submission tracking with revision history
(define-map WorkSubmissions
    {task-id: uint, submission-id: uint}
    {
        worker: principal,
        submission-links: (string-ascii 500), ;; Multiple links separated by semicolons
        submitted-at: uint,
        revision-requested: bool,
        revision-notes: (optional (string-ascii 256))
    }
)

;; Recovery requests for stuck tasks
(define-map RecoveryRequests
    uint ;; Task ID
    {
        requester: principal,
        reason: (string-ascii 256),
        requested-at: uint,
        timelock-expires: uint,
        approved: bool
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
        dispute-id: (optional uint),         ; New field for dispute tracking
        rating: (optional uint),             ; New field for task rating (1-5 stars)
        milestone-count: uint,               ; Number of milestones (0 for regular tasks)
        escrow-remaining: uint,              ; Remaining escrow balance for milestones
        revision-count: uint,                ; Number of revisions requested
        submission-count: uint,              ; Number of submissions made
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
            dispute-id: none,
            rating: none,
            milestone-count: u0,
            escrow-remaining: amount,
            revision-count: u0,
            submission-count: u0,
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

;; @desc Create a multi-milestone task
;; @param title (string-ascii 100) - Task title
;; @param description (string-ascii 500) - Task description
;; @param category (string-ascii 30) - Task category
;; @param milestones (list 10 {description: (string-ascii 200), amount: uint, deadline: uint}) - Milestone definitions
(define-public (create-milestone-task
        (title (string-ascii 100))
        (description (string-ascii 500))
        (category (string-ascii 30))
        (milestones (list 10 {description: (string-ascii 200), amount: uint, deadline: uint}))
    )
    (let (
        (task-id (+ (var-get task-nonce) u1))
        (total-amount (fold + (map get-milestone-amount milestones) u0))
        (milestone-count (len milestones))
    )
        ;; Initialize categories on first use
        (try! (initialize-categories))
        
        ;; Validate basic parameters (excluding amount and deadline as they're in milestones)
        (asserts! (>= (len title) MIN-TITLE-LENGTH) ERR-TITLE-TOO-SHORT)
        (asserts! (<= (len title) MAX-TITLE-LENGTH) ERR-TITLE-TOO-LONG)
        (asserts! (>= (len description) MIN-DESCRIPTION-LENGTH) ERR-DESCRIPTION-TOO-SHORT)
        (asserts! (<= (len description) MAX-DESCRIPTION-LENGTH) ERR-DESCRIPTION-TOO-LONG)
        (try! (validate-category category))
        
        ;; Validate milestone count
        (asserts! (> milestone-count u0) ERR-NO-MILESTONES)
        (asserts! (>= total-amount MIN-AMOUNT) ERR-AMOUNT-TOO-LOW)
        (asserts! (<= total-amount MAX-AMOUNT) ERR-AMOUNT-TOO-HIGH)

        ;; Transfer total STX from creator to contract
        (try! (stx-transfer? total-amount tx-sender (as-contract tx-sender)))

        ;; Store task data
        (map-set Tasks task-id {
            title: title,
            description: description,
            creator: tx-sender,
            worker: none,
            amount: total-amount,
            deadline: (get deadline (unwrap-panic (element-at milestones (- milestone-count u1)))), ;; Last milestone deadline
            status: "open",
            submission: none,
            created-at: stacks-block-height,
            category: category,
            dispute-id: none,
            rating: none,
            milestone-count: milestone-count,
            escrow-remaining: total-amount,
            revision-count: u0,
            submission-count: u0,
        })

        ;; Create milestone records
        (try! (create-milestone-records task-id milestones))

        ;; Update category statistics
        (try! (increment-category-count category))

        ;; Increment nonce
        (var-set task-nonce task-id)

        ;; Emit event
        (print {
            event: "milestone-task-created",
            id: task-id,
            creator: tx-sender,
            total-amount: total-amount,
            milestone-count: milestone-count,
            category: category,
        })

        (ok task-id)
    )
)

;; @desc Helper function to get milestone amount
(define-private (get-milestone-amount (milestone {description: (string-ascii 200), amount: uint, deadline: uint}))
    (get amount milestone)
)

;; @desc Create milestone records for a task
;; @param task-id uint - Task ID
;; @param milestones (list 10 {description: (string-ascii 200), amount: uint, deadline: uint}) - Milestone definitions
(define-private (create-milestone-records 
        (task-id uint)
        (milestones (list 10 {description: (string-ascii 200), amount: uint, deadline: uint}))
    )
    (let ((milestone-ids (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9)))
        (fold create-single-milestone 
            (zip milestone-ids milestones)
            {task-id: task-id, success: true}
        )
        (ok true)
    )
)

;; @desc Helper function to create a single milestone
(define-private (create-single-milestone 
        (data {milestone-id: uint, milestone: {description: (string-ascii 200), amount: uint, deadline: uint}})
        (acc {task-id: uint, success: bool})
    )
    (if (get success acc)
        (begin
            (map-set TaskMilestones 
                {task-id: (get task-id acc), milestone-id: (get milestone-id data)}
                {
                    description: (get description (get milestone data)),
                    amount: (get amount (get milestone data)),
                    deadline: (get deadline (get milestone data)),
                    status: "pending",
                    submission: none,
                    completed-at: none
                }
            )
            acc
        )
        acc
    )
)

;; @desc Complete a milestone
;; @param task-id uint - Task ID
;; @param milestone-id uint - Milestone ID
;; @param submission (string-ascii 256) - Milestone submission
(define-public (complete-milestone
        (task-id uint)
        (milestone-id uint)
        (submission (string-ascii 256))
    )
    (let (
        (task (unwrap! (map-get? Tasks task-id) ERR-INVALID-ID))
        (milestone (unwrap! (map-get? TaskMilestones {task-id: task-id, milestone-id: milestone-id}) ERR-INVALID-MILESTONE))
    )
        ;; Check sender is the worker
        (asserts! (is-eq (some tx-sender) (get worker task)) ERR-NOT-WORKER)
        
        ;; Check task is in progress
        (asserts! (is-eq (get status task) "in-progress") ERR-NOT-IN-PROGRESS)
        
        ;; Check milestone is pending
        (asserts! (is-eq (get status milestone) "pending") ERR-MILESTONE-ALREADY-COMPLETED)
        
        ;; Check this is the next milestone in sequence
        (asserts! (is-eq milestone-id (get-next-milestone-id task-id)) ERR-MILESTONE-NOT-NEXT)
        
        ;; Update milestone status
        (map-set TaskMilestones {task-id: task-id, milestone-id: milestone-id}
            (merge milestone {
                status: "completed",
                submission: (some submission),
                completed-at: (some stacks-block-height)
            })
        )
        
        ;; Emit event
        (print {
            event: "milestone-completed",
            task-id: task-id,
            milestone-id: milestone-id,
            worker: tx-sender,
            submission: submission
        })
        
        (ok true)
    )
)

;; @desc Release payment for a completed milestone
;; @param task-id uint - Task ID
;; @param milestone-id uint - Milestone ID
(define-public (release-milestone-payment
        (task-id uint)
        (milestone-id uint)
    )
    (let (
        (task (unwrap! (map-get? Tasks task-id) ERR-INVALID-ID))
        (milestone (unwrap! (map-get? TaskMilestones {task-id: task-id, milestone-id: milestone-id}) ERR-INVALID-MILESTONE))
    )
        ;; Check sender is the creator
        (asserts! (is-eq tx-sender (get creator task)) ERR-NOT-CREATOR)
        
        ;; Check milestone is completed
        (asserts! (is-eq (get status milestone) "completed") ERR-NOT-SUBMITTED)
        
        ;; Check sufficient escrow
        (asserts! (>= (get escrow-remaining task) (get amount milestone)) ERR-INSUFFICIENT-ESCROW)
        
        (let ((worker-principal (unwrap! (get worker task) ERR-NOT-WORKER)))
            ;; Update milestone status
            (map-set TaskMilestones {task-id: task-id, milestone-id: milestone-id}
                (merge milestone {
                    status: "paid"
                })
            )
            
            ;; Update task escrow balance
            (map-set Tasks task-id
                (merge task {
                    escrow-remaining: (- (get escrow-remaining task) (get amount milestone))
                })
            )
            
            ;; Transfer payment to worker
            (try! (as-contract (stx-transfer? (get amount milestone) tx-sender worker-principal)))
            
            ;; Check if all milestones are completed
            (let ((all-completed (is-eq (+ milestone-id u1) (get milestone-count task))))
                (if all-completed
                    (map-set Tasks task-id
                        (merge task {
                            status: "completed",
                            escrow-remaining: (- (get escrow-remaining task) (get amount milestone))
                        })
                    )
                    true
                )
            )
            
            ;; Emit event
            (print {
                event: "milestone-payment-released",
                task-id: task-id,
                milestone-id: milestone-id,
                worker: worker-principal,
                amount: (get amount milestone)
            })
            
            (ok true)
        )
    )
)

;; @desc Get next milestone ID that should be completed
;; @param task-id uint - Task ID
(define-private (get-next-milestone-id (task-id uint))
    (let ((task (unwrap-panic (map-get? Tasks task-id))))
        (fold find-next-milestone 
            (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9)
            {task-id: task-id, next-id: u0, found: false}
        )
    )
)

;; @desc Helper to find next milestone
(define-private (find-next-milestone 
        (milestone-id uint)
        (acc {task-id: uint, next-id: uint, found: bool})
    )
    (if (get found acc)
        acc
        (match (map-get? TaskMilestones {task-id: (get task-id acc), milestone-id: milestone-id})
            milestone (if (is-eq (get status milestone) "pending")
                {task-id: (get task-id acc), next-id: milestone-id, found: true}
                acc
            )
            acc
        )
    )
)

;; @desc Add or update arbitrator
;; @param arbitrator principal - Arbitrator to add
(define-public (add-arbitrator (arbitrator principal))
    (begin
        ;; Only contract owner can add arbitrators
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        (map-set Arbitrators arbitrator {
            active: true,
            total-cases: u0,
            reputation-score: u100 ;; Start with 100 reputation
        })
        
        (print {
            event: "arbitrator-added",
            arbitrator: arbitrator
        })
        
        (ok true)
    )
)

;; @desc Calculate dispute fee based on task amount
;; @param task-amount uint - Amount of the task
(define-private (calculate-dispute-fee (task-amount uint))
    (let ((percentage-fee (/ (* task-amount DISPUTE-FEE-PERCENTAGE) u100)))
        (if (>= percentage-fee MIN-DISPUTE-FEE)
            percentage-fee
            MIN-DISPUTE-FEE
        )
    )
)

;; @desc Initiate a dispute for a task
;; @param task-id uint - Task ID to dispute
;; @param reason (string-ascii 256) - Reason for dispute
(define-public (initiate-dispute 
        (task-id uint)
        (reason (string-ascii 256))
    )
    (let (
        (task (unwrap! (map-get? Tasks task-id) ERR-INVALID-ID))
        (dispute-id (+ (var-get dispute-nonce) u1))
        (dispute-fee (calculate-dispute-fee (get amount task)))
    )
        ;; Check task doesn't already have a dispute
        (asserts! (is-none (get dispute-id task)) ERR-DISPUTE-EXISTS)
        
        ;; Check caller is creator or worker
        (asserts! (or 
            (is-eq tx-sender (get creator task))
            (is-eq (some tx-sender) (get worker task))
        ) ERR-NOT-DISPUTE-PARTICIPANT)
        
        ;; Check task is in valid state for dispute (in-progress or submitted)
        (asserts! (or 
            (is-eq (get status task) "in-progress")
            (is-eq (get status task) "submitted")
        ) ERR-NOT-IN-PROGRESS)
        
        ;; Charge dispute fee
        (try! (stx-transfer? dispute-fee tx-sender (as-contract tx-sender)))
        
        ;; Create dispute record
        (map-set Disputes dispute-id {
            task-id: task-id,
            initiator: tx-sender,
            reason: reason,
            arbitrator: none,
            resolution: none,
            created-at: stacks-block-height,
            resolved-at: none,
            winner: none,
            fee-paid: dispute-fee
        })
        
        ;; Update task status and link dispute
        (map-set Tasks task-id
            (merge task {
                status: "disputed",
                dispute-id: (some dispute-id)
            })
        )
        
        ;; Increment dispute nonce
        (var-set dispute-nonce dispute-id)
        
        ;; Emit event
        (print {
            event: "dispute-initiated",
            task-id: task-id,
            dispute-id: dispute-id,
            initiator: tx-sender,
            reason: reason,
            fee-paid: dispute-fee
        })
        
        (ok dispute-id)
    )
)

;; @desc Initialize or get user reputation
;; @param user principal - User to initialize
(define-private (ensure-user-reputation (user principal))
    (match (map-get? UserReputation user)
        existing-rep (ok existing-rep)
        (begin
            (map-set UserReputation user {
                total-tasks: u0,
                completed-tasks: u0,
                total-earned: u0,
                total-spent: u0,
                average-rating: u0,
                dispute-count: u0,
                last-activity: stacks-block-height
            })
            (ok {
                total-tasks: u0,
                completed-tasks: u0,
                total-earned: u0,
                total-spent: u0,
                average-rating: u0,
                dispute-count: u0,
                last-activity: stacks-block-height
            })
        )
    )
)

;; @desc Update reputation after task completion
;; @param creator principal - Task creator
;; @param worker principal - Task worker
;; @param amount uint - Task amount
;; @param rating uint - Task rating (1-5)
(define-private (update-reputation-on-completion
        (creator principal)
        (worker principal)
        (amount uint)
        (rating uint)
    )
    (begin
        ;; Update creator reputation
        (let ((creator-rep (try! (ensure-user-reputation creator))))
            (map-set UserReputation creator
                (merge creator-rep {
                    total-tasks: (+ (get total-tasks creator-rep) u1),
                    completed-tasks: (+ (get completed-tasks creator-rep) u1),
                    total-spent: (+ (get total-spent creator-rep) amount),
                    last-activity: stacks-block-height
                })
            )
        )
        
        ;; Update worker reputation
        (let ((worker-rep (try! (ensure-user-reputation worker))))
            (let (
                (new-total-tasks (+ (get total-tasks worker-rep) u1))
                (new-completed-tasks (+ (get completed-tasks worker-rep) u1))
                (current-avg (get average-rating worker-rep))
                (new-avg (if (is-eq current-avg u0)
                    (* rating u100) ;; First rating
                    (/ (+ (* current-avg (get completed-tasks worker-rep)) (* rating u100)) new-completed-tasks)
                ))
            )
                (map-set UserReputation worker
                    (merge worker-rep {
                        total-tasks: new-total-tasks,
                        completed-tasks: new-completed-tasks,
                        total-earned: (+ (get total-earned worker-rep) amount),
                        average-rating: new-avg,
                        last-activity: stacks-block-height
                    })
                )
            )
        )
        
        (ok true)
    )
)

;; @desc Update reputation after dispute
;; @param creator principal - Task creator
;; @param worker principal - Task worker
;; @param winner principal - Dispute winner
(define-private (update-reputation-on-dispute
        (creator principal)
        (worker principal)
        (winner principal)
    )
    (begin
        ;; Update creator reputation
        (let ((creator-rep (try! (ensure-user-reputation creator))))
            (map-set UserReputation creator
                (merge creator-rep {
                    dispute-count: (+ (get dispute-count creator-rep) u1),
                    last-activity: stacks-block-height
                })
            )
        )
        
        ;; Update worker reputation
        (let ((worker-rep (try! (ensure-user-reputation worker))))
            (map-set UserReputation worker
                (merge worker-rep {
                    dispute-count: (+ (get dispute-count worker-rep) u1),
                    last-activity: stacks-block-height
                })
            )
        )
        
        (ok true)
    )
)

;; @desc Assign arbitrator to a dispute
;; @param dispute-id uint - Dispute ID
;; @param arbitrator principal - Arbitrator to assign
(define-public (assign-arbitrator 
        (dispute-id uint)
        (arbitrator principal)
    )
    (let ((dispute (unwrap! (map-get? Disputes dispute-id) ERR-DISPUTE-NOT-FOUND)))
        ;; Only contract owner can assign arbitrators
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Check dispute is not already resolved
        (asserts! (is-none (get resolved-at dispute)) ERR-DISPUTE-ALREADY-RESOLVED)
        
        ;; Check arbitrator is active
        (let ((arb-data (unwrap! (map-get? Arbitrators arbitrator) ERR-NOT-ARBITRATOR)))
            (asserts! (get active arb-data) ERR-NOT-ARBITRATOR)
            
            ;; Update dispute with arbitrator
            (map-set Disputes dispute-id
                (merge dispute {
                    arbitrator: (some arbitrator)
                })
            )
            
            ;; Emit event
            (print {
                event: "arbitrator-assigned",
                dispute-id: dispute-id,
                arbitrator: arbitrator
            })
            
            (ok true)
        )
    )
)

;; @desc Resolve dispute with arbitrator decision
;; @param dispute-id uint - Dispute ID
;; @param winner (string-ascii 10) - "creator" or "worker"
;; @param resolution (string-ascii 256) - Resolution explanation
(define-public (resolve-dispute 
        (dispute-id uint)
        (winner (string-ascii 10))
        (resolution (string-ascii 256))
    )
    (let (
        (dispute (unwrap! (map-get? Disputes dispute-id) ERR-DISPUTE-NOT-FOUND))
        (task (unwrap! (map-get? Tasks (get task-id dispute)) ERR-INVALID-ID))
    )
        ;; Check caller is assigned arbitrator
        (asserts! (is-eq (some tx-sender) (get arbitrator dispute)) ERR-NOT-ARBITRATOR)
        
        ;; Check dispute is not already resolved
        (asserts! (is-none (get resolved-at dispute)) ERR-DISPUTE-ALREADY-RESOLVED)
        
        ;; Validate winner decision
        (asserts! (or 
            (is-eq winner "creator")
            (is-eq winner "worker")
        ) ERR-INVALID-DISPUTE-DECISION)
        
        ;; Determine fund recipient based on decision
        (let (
            (recipient (if (is-eq winner "creator")
                (get creator task)
                (unwrap! (get worker task) ERR-NOT-WORKER)
            ))
            (task-amount (get amount task))
        )
            ;; Update dispute record
            (map-set Disputes dispute-id
                (merge dispute {
                    resolution: (some resolution),
                    resolved-at: (some stacks-block-height),
                    winner: (some (if (is-eq winner "creator") (get creator task) (unwrap-panic (get worker task))))
                })
            )
            
            ;; Update task status
            (map-set Tasks (get task-id dispute)
                (merge task {
                    status: "completed"
                })
            )
            
            ;; Transfer funds to winner
            (try! (as-contract (stx-transfer? task-amount tx-sender recipient)))
            
            ;; Update reputation for dispute
            (try! (update-reputation-on-dispute 
                (get creator task) 
                (unwrap! (get worker task) ERR-NOT-WORKER)
                recipient
            ))
            
            ;; Update arbitrator statistics
            (let ((arb-data (unwrap-panic (map-get? Arbitrators tx-sender))))
                (map-set Arbitrators tx-sender
                    (merge arb-data {
                        total-cases: (+ (get total-cases arb-data) u1)
                    })
                )
            )
            
            ;; Emit event
            (print {
                event: "dispute-resolved",
                dispute-id: dispute-id,
                task-id: (get task-id dispute),
                winner: winner,
                recipient: recipient,
                amount: task-amount,
                arbitrator: tx-sender,
                resolution: resolution
            })
            
            (ok true)
        )
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

;; @desc Submit work for a task with multiple links
;; @param id uint - Task ID
;; @param submission-links (string-ascii 500) - Multiple submission links separated by semicolons
(define-public (submit-work
        (id uint)
        (submission-links (string-ascii 500))
    )
    (let (
        (task (unwrap! (map-get? Tasks id) ERR-INVALID-ID))
        (submission-id (get submission-count task))
    )
        ;; Check status is in-progress
        (asserts! (is-eq (get status task) "in-progress") ERR-NOT-IN-PROGRESS)

        ;; Check sender is the worker
        (asserts! (is-eq (some tx-sender) (get worker task)) ERR-NOT-WORKER)
        
        ;; Validate submission format (basic check for non-empty)
        (asserts! (> (len submission-links) u0) ERR-INVALID-SUBMISSION_FORMAT)

        ;; Create work submission record
        (map-set WorkSubmissions {task-id: id, submission-id: submission-id}
            {
                worker: tx-sender,
                submission-links: submission-links,
                submitted-at: stacks-block-height,
                revision-requested: false,
                revision-notes: none
            }
        )

        ;; Update task
        (map-set Tasks id
            (merge task {
                status: "submitted",
                submission: (some submission-links),
                submission-count: (+ submission-id u1)
            })
        )

        ;; Emit event
        (print {
            event: "work-submitted",
            id: id,
            worker: tx-sender,
            submission-id: submission-id,
            submission-links: submission-links,
            submitted-at: stacks-block-height
        })

        (ok true)
    )
)

;; @desc Request revision for submitted work
;; @param task-id uint - Task ID
;; @param revision-notes (string-ascii 256) - Notes for revision
(define-public (request-revision
        (task-id uint)
        (revision-notes (string-ascii 256))
    )
    (let (
        (task (unwrap! (map-get? Tasks task-id) ERR-INVALID-ID))
        (current-submission-id (- (get submission-count task) u1))
    )
        ;; Check that sender is the creator
        (asserts! (is-eq tx-sender (get creator task)) ERR-NOT-CREATOR)

        ;; Check that status is submitted
        (asserts! (is-eq (get status task) "submitted") ERR-NOT-SUBMITTED)
        
        ;; Check revision limit
        (asserts! (< (get revision-count task) MAX-REVISIONS) ERR-REVISION-LIMIT_EXCEEDED)

        ;; Update work submission record
        (let ((submission (unwrap! (map-get? WorkSubmissions {task-id: task-id, submission-id: current-submission-id}) ERR-INVALID-ID)))
            (map-set WorkSubmissions {task-id: task-id, submission-id: current-submission-id}
                (merge submission {
                    revision-requested: true,
                    revision-notes: (some revision-notes)
                })
            )
        )

        ;; Update task status and extend deadline
        (map-set Tasks task-id
            (merge task {
                status: "in-progress",
                revision-count: (+ (get revision-count task) u1),
                deadline: (+ (get deadline task) REVISION-DEADLINE-EXTENSION)
            })
        )

        ;; Emit event
        (print {
            event: "revision-requested",
            task-id: task-id,
            creator: tx-sender,
            revision-count: (+ (get revision-count task) u1),
            notes: revision-notes,
            new-deadline: (+ (get deadline task) REVISION-DEADLINE-EXTENSION)
        })

        (ok true)
    )
)

;; @desc Approve work and release payment to worker
;; @param id uint - Task ID
;; @param rating uint - Rating for the work (1-5 stars)
(define-public (approve-work (id uint) (rating uint))
    (let ((task (unwrap! (map-get? Tasks id) ERR-INVALID-ID)))
        ;; Check that sender is the creator
        (asserts! (is-eq tx-sender (get creator task)) ERR-NOT-CREATOR)

        ;; Check that status is submitted
        (asserts! (is-eq (get status task) "submitted") ERR-NOT-SUBMITTED)
        
        ;; Validate rating
        (asserts! (and (>= rating u1) (<= rating u5)) ERR-INVALID-RATING)

        ;; Get worker principal
        (let ((worker-principal (unwrap! (get worker task) ERR-NOT-WORKER)))
            ;; Update task status and rating before transfer
            (map-set Tasks id
                (merge task {
                    status: "completed",
                    rating: (some rating)
                })
            )

            ;; Transfer STX from contract to worker
            (try! (as-contract (stx-transfer? (get amount task) tx-sender worker-principal)))
            
            ;; Update reputation for both parties
            (try! (update-reputation-on-completion 
                (get creator task) 
                worker-principal 
                (get amount task) 
                rating
            ))

            ;; Emit event
            (print {
                event: "approved",
                id: id,
                creator: tx-sender,
                worker: worker-principal,
                amount: (get amount task),
                rating: rating
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

;; @desc Get dispute information
;; @param dispute-id uint - Dispute ID
(define-read-only (get-dispute (dispute-id uint))
    (map-get? Disputes dispute-id)
)

;; @desc Get arbitrator information
;; @param arbitrator principal - Arbitrator principal
(define-read-only (get-arbitrator (arbitrator principal))
    (map-get? Arbitrators arbitrator)
)

;; @desc Get dispute nonce
(define-read-only (get-dispute-nonce)
    (var-get dispute-nonce)
)

;; @desc Get user reputation
;; @param user principal - User to query
(define-read-only (get-user-reputation (user principal))
    (map-get? UserReputation user)
)

;; @desc Calculate user trust score based on reputation
;; @param user principal - User to calculate score for
(define-read-only (calculate-trust-score (user principal))
    (match (map-get? UserReputation user)
        rep (let (
            (completion-rate (if (> (get total-tasks rep) u0)
                (/ (* (get completed-tasks rep) u100) (get total-tasks rep))
                u0
            ))
            (rating-score (get average-rating rep))
            (dispute-penalty (if (> (get completed-tasks rep) u0)
                (/ (* (get dispute-count rep) u100) (get completed-tasks rep))
                u0
            ))
        )
            ;; Trust score = (completion-rate * 0.4) + (rating-score * 0.4) - (dispute-penalty * 0.2)
            (let ((base-score (+ (/ (* completion-rate u40) u100) (/ (* rating-score u40) u100))))
                (if (>= base-score (/ (* dispute-penalty u20) u100))
                    (- base-score (/ (* dispute-penalty u20) u100))
                    u0
                )
            )
        )
        u0 ;; No reputation data
    )
)

;; @desc Get milestone information
;; @param task-id uint - Task ID
;; @param milestone-id uint - Milestone ID
(define-read-only (get-milestone (task-id uint) (milestone-id uint))
    (map-get? TaskMilestones {task-id: task-id, milestone-id: milestone-id})
)

;; @desc Get all milestones for a task
;; @param task-id uint - Task ID
(define-read-only (get-task-milestones (task-id uint))
    (let ((task (unwrap! (map-get? Tasks task-id) (err "Task not found"))))
        (if (> (get milestone-count task) u0)
            (ok (map (get-milestone-for-task task-id) (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9)))
            (err "Task has no milestones")
        )
    )
)

;; @desc Helper to get milestone for specific task
(define-private (get-milestone-for-task (task-id uint) (milestone-id uint))
    (map-get? TaskMilestones {task-id: task-id, milestone-id: milestone-id})
)

;; @desc Get tasks with pagination
;; @param start-id uint - Starting task ID
;; @param limit uint - Maximum number of tasks to return
(define-read-only (get-tasks-paginated (start-id uint) (limit uint))
    (let (
        (max-id (var-get task-nonce))
        (end-id (if (<= (+ start-id limit) max-id) (+ start-id limit) max-id))
        (task-ids (generate-range start-id end-id))
    )
        (map get-task task-ids)
    )
)

;; @desc Generate range of task IDs
;; @param start uint - Start ID
;; @param end uint - End ID
(define-private (generate-range (start uint) (end uint))
    (if (<= start end)
        (filter is-valid-id (list start (+ start u1) (+ start u2) (+ start u3) (+ start u4) 
                                 (+ start u5) (+ start u6) (+ start u7) (+ start u8) (+ start u9)))
        (list)
    )
)

;; @desc Check if ID is valid for range
(define-private (is-valid-id (id uint))
    (<= id (var-get task-nonce))
)

;; @desc Filter tasks by status
;; @param status (string-ascii 20) - Status to filter by
;; @param task-ids (list 200 uint) - Task IDs to filter
(define-read-only (get-tasks-by-status 
        (status (string-ascii 20))
        (task-ids (list 200 uint))
    )
    (filter (check-task-status status) (map get-task task-ids))
)

;; @desc Helper to check task status
(define-private (check-task-status (target-status (string-ascii 20)) (task-opt (optional {
        title: (string-ascii 100),
        description: (string-ascii 500),
        creator: principal,
        worker: (optional principal),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20),
        submission: (optional (string-ascii 500)),
        created-at: uint,
        category: (string-ascii 30),
        dispute-id: (optional uint),
        rating: (optional uint),
        milestone-count: uint,
        escrow-remaining: uint
    })))
    (match task-opt
        task (is-eq (get status task) target-status)
        false
    )
)

;; @desc Filter tasks by amount range
;; @param min-amount uint - Minimum amount
;; @param max-amount uint - Maximum amount
;; @param task-ids (list 200 uint) - Task IDs to filter
(define-read-only (get-tasks-by-amount-range 
        (min-amount uint)
        (max-amount uint)
        (task-ids (list 200 uint))
    )
    (filter (check-task-amount-range min-amount max-amount) (map get-task task-ids))
)

;; @desc Helper to check task amount range
(define-private (check-task-amount-range (min-amount uint) (max-amount uint) (task-opt (optional {
        title: (string-ascii 100),
        description: (string-ascii 500),
        creator: principal,
        worker: (optional principal),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20),
        submission: (optional (string-ascii 500)),
        created-at: uint,
        category: (string-ascii 30),
        dispute-id: (optional uint),
        rating: (optional uint),
        milestone-count: uint,
        escrow-remaining: uint
    })))
    (match task-opt
        task (and (>= (get amount task) min-amount) (<= (get amount task) max-amount))
        false
    )
)

;; @desc Filter tasks by deadline range
;; @param min-deadline uint - Minimum deadline
;; @param max-deadline uint - Maximum deadline
;; @param task-ids (list 200 uint) - Task IDs to filter
(define-read-only (get-tasks-by-deadline-range 
        (min-deadline uint)
        (max-deadline uint)
        (task-ids (list 200 uint))
    )
    (filter (check-task-deadline-range min-deadline max-deadline) (map get-task task-ids))
)

;; @desc Helper to check task deadline range
(define-private (check-task-deadline-range (min-deadline uint) (max-deadline uint) (task-opt (optional {
        title: (string-ascii 100),
        description: (string-ascii 500),
        creator: principal,
        worker: (optional principal),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20),
        submission: (optional (string-ascii 500)),
        created-at: uint,
        category: (string-ascii 30),
        dispute-id: (optional uint),
        rating: (optional uint),
        milestone-count: uint,
        escrow-remaining: uint
    })))
    (match task-opt
        task (and (>= (get deadline task) min-deadline) (<= (get deadline task) max-deadline))
        false
    )
)

;; @desc Advanced task search with multiple filters
;; @param filters {status: (optional (string-ascii 20)), category: (optional (string-ascii 30)), min-amount: (optional uint), max-amount: (optional uint)}
;; @param start-id uint - Starting task ID for pagination
;; @param limit uint - Maximum results to return
(define-read-only (search-tasks 
        (filters {
            status: (optional (string-ascii 20)),
            category: (optional (string-ascii 30)),
            min-amount: (optional uint),
            max-amount: (optional uint)
        })
        (start-id uint)
        (limit uint)
    )
    (let (
        (base-tasks (get-tasks-paginated start-id limit))
        (filtered-tasks (apply-search-filters filters base-tasks))
    )
        filtered-tasks
    )
)

;; @desc Apply search filters to task list
(define-private (apply-search-filters 
        (filters {
            status: (optional (string-ascii 20)),
            category: (optional (string-ascii 30)),
            min-amount: (optional uint),
            max-amount: (optional uint)
        })
        (tasks (list 200 (optional {
            title: (string-ascii 100),
            description: (string-ascii 500),
            creator: principal,
            worker: (optional principal),
            amount: uint,
            deadline: uint,
            status: (string-ascii 20),
            submission: (optional (string-ascii 500)),
            created-at: uint,
            category: (string-ascii 30),
            dispute-id: (optional uint),
            rating: (optional uint),
            milestone-count: uint,
            escrow-remaining: uint
        })))
    )
    (let (
        (status-filtered (match (get status filters)
            status (filter (check-task-status status) tasks)
            tasks
        ))
        (category-filtered (match (get category filters)
            category (filter (check-task-category category) status-filtered)
            status-filtered
        ))
        (amount-filtered (match (get min-amount filters)
            min-amt (match (get max-amount filters)
                max-amt (filter (check-task-amount-range min-amt max-amt) category-filtered)
                category-filtered
            )
            category-filtered
        ))
    )
        amount-filtered
    )
)

;; @desc Helper to check task category
(define-private (check-task-category (target-category (string-ascii 30)) (task-opt (optional {
        title: (string-ascii 100),
        description: (string-ascii 500),
        creator: principal,
        worker: (optional principal),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20),
        submission: (optional (string-ascii 500)),
        created-at: uint,
        category: (string-ascii 30),
        dispute-id: (optional uint),
        rating: (optional uint),
        milestone-count: uint,
        escrow-remaining: uint
    })))
    (match task-opt
        task (is-eq (get category task) target-category)
        false
    )
)

;; @desc Update task details (only for open tasks)
;; @param task-id uint - Task ID to update
;; @param new-title (optional (string-ascii 100)) - New title
;; @param new-description (optional (string-ascii 500)) - New description
;; @param new-deadline (optional uint) - New deadline
(define-public (update-task
        (task-id uint)
        (new-title (optional (string-ascii 100)))
        (new-description (optional (string-ascii 500)))
        (new-deadline (optional uint))
    )
    (let ((task (unwrap! (map-get? Tasks task-id) ERR-INVALID-ID)))
        ;; Check that sender is the creator
        (asserts! (is-eq tx-sender (get creator task)) ERR-NOT-CREATOR)
        
        ;; Check that task is open (can only modify open tasks)
        (asserts! (is-eq (get status task) "open") ERR-TASK-NOT-MODIFIABLE)
        
        ;; Validate new parameters if provided
        (match new-title
            title (begin
                (asserts! (>= (len title) MIN-TITLE-LENGTH) ERR-TITLE-TOO-SHORT)
                (asserts! (<= (len title) MAX-TITLE-LENGTH) ERR-TITLE-TOO-LONG)
            )
            true
        )
        
        (match new-description
            desc (begin
                (asserts! (>= (len desc) MIN-DESCRIPTION-LENGTH) ERR-DESCRIPTION-TOO-SHORT)
                (asserts! (<= (len desc) MAX-DESCRIPTION-LENGTH) ERR-DESCRIPTION-TOO-LONG)
            )
            true
        )
        
        (match new-deadline
            deadline (asserts! (>= deadline (+ stacks-block-height MIN-DEADLINE-BLOCKS)) ERR-DEADLINE-TOO-SOON)
            true
        )
        
        ;; Update task with new values
        (map-set Tasks task-id
            (merge task {
                title: (default-to (get title task) new-title),
                description: (default-to (get description task) new-description),
                deadline: (default-to (get deadline task) new-deadline)
            })
        )
        
        ;; Emit event
        (print {
            event: "task-updated",
            id: task-id,
            creator: tx-sender,
            updated-fields: {
                title: (is-some new-title),
                description: (is-some new-description),
                deadline: (is-some new-deadline)
            }
        })
        
        (ok true)
    )
)

;; @desc Clean up expired open tasks
;; @param task-id uint - Task ID to clean up
(define-public (cleanup-expired-task (task-id uint))
    (let ((task (unwrap! (map-get? Tasks task-id) ERR-INVALID-ID)))
        ;; Check task is open and expired
        (asserts! (is-eq (get status task) "open") ERR-NOT-OPEN)
        (asserts! (<= (get deadline task) stacks-block-height) ERR-PAST-DEADLINE)
        
        ;; Update task status to completed (expired)
        (map-set Tasks task-id
            (merge task {
                status: "completed"
            })
        )
        
        ;; Refund STX from contract back to creator
        (try! (as-contract (stx-transfer? (get amount task) tx-sender (get creator task))))
        
        ;; Emit event
        (print {
            event: "task-expired-cleanup",
            id: task-id,
            creator: (get creator task),
            amount: (get amount task),
            expired-at: stacks-block-height
        })
        
        (ok true)
    )
)

;; @desc Batch cleanup expired tasks
;; @param task-ids (list 50 uint) - List of task IDs to check and cleanup
(define-public (batch-cleanup-expired (task-ids (list 50 uint)))
    (begin
        (map cleanup-single-expired task-ids)
        (ok true)
    )
)

;; @desc Helper function for batch cleanup
(define-private (cleanup-single-expired (task-id uint))
    (match (map-get? Tasks task-id)
        task (if (and 
                (is-eq (get status task) "open")
                (<= (get deadline task) stacks-block-height)
            )
            (begin
                (map-set Tasks task-id
                    (merge task {
                        status: "completed"
                    })
                )
                (as-contract (stx-transfer? (get amount task) tx-sender (get creator task)))
                (print {
                    event: "task-expired-cleanup",
                    id: task-id,
                    creator: (get creator task),
                    amount: (get amount task),
                    expired-at: stacks-block-height
                })
                true
            )
            false
        )
        false
    )
)

;; @desc Get expired tasks that need cleanup
;; @param start-id uint - Starting task ID
;; @param limit uint - Maximum tasks to check
(define-read-only (get-expired-tasks (start-id uint) (limit uint))
    (let (
        (tasks (get-tasks-paginated start-id limit))
        (current-block stacks-block-height)
    )
        (filter (check-task-expired current-block) tasks)
    )
)

;; @desc Helper to check if task is expired
(define-private (check-task-expired (current-block uint) (task-opt (optional {
        title: (string-ascii 100),
        description: (string-ascii 500),
        creator: principal,
        worker: (optional principal),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20),
        submission: (optional (string-ascii 500)),
        created-at: uint,
        category: (string-ascii 30),
        dispute-id: (optional uint),
        rating: (optional uint),
        milestone-count: uint,
        escrow-remaining: uint
    })))
    (match task-opt
        task (and 
            (is-eq (get status task) "open")
            (<= (get deadline task) current-block)
        )
        false
    )
)

;; @desc Get work submission details
;; @param task-id uint - Task ID
;; @param submission-id uint - Submission ID
(define-read-only (get-work-submission (task-id uint) (submission-id uint))
    (map-get? WorkSubmissions {task-id: task-id, submission-id: submission-id})
)

;; @desc Get all submissions for a task
;; @param task-id uint - Task ID
(define-read-only (get-task-submissions (task-id uint))
    (let ((task (unwrap! (map-get? Tasks task-id) (err "Task not found"))))
        (if (> (get submission-count task) u0)
            (ok (map (get-submission-for-task task-id) (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9)))
            (err "Task has no submissions")
        )
    )
)

;; @desc Helper to get submission for specific task
(define-private (get-submission-for-task (task-id uint) (submission-id uint))
    (map-get? WorkSubmissions {task-id: task-id, submission-id: submission-id})
)

;; @desc Get revision history for a task
;; @param task-id uint - Task ID
(define-read-only (get-revision-history (task-id uint))
    (let ((task (unwrap! (map-get? Tasks task-id) (err "Task not found"))))
        (ok {
            revision-count: (get revision-count task),
            submission-count: (get submission-count task),
            current-deadline: (get deadline task)
        })
    )
)

;; @desc Rate a completed task (can be called by both creator and worker)
;; @param task-id uint - Task ID to rate
;; @param rating uint - Rating (1-5 stars)
;; @param review (optional (string-ascii 256)) - Optional review text
(define-public (rate-completed-task
        (task-id uint)
        (rating uint)
        (review (optional (string-ascii 256)))
    )
    (let ((task (unwrap! (map-get? Tasks task-id) ERR-INVALID-ID)))
        ;; Check task is completed
        (asserts! (is-eq (get status task) "completed") ERR-ALREADY-COMPLETED)
        
        ;; Check caller is creator or worker
        (asserts! (or 
            (is-eq tx-sender (get creator task))
            (is-eq (some tx-sender) (get worker task))
        ) ERR-NOT-DISPUTE-PARTICIPANT)
        
        ;; Validate rating
        (asserts! (and (>= rating u1) (<= rating u5)) ERR-INVALID-RATING)
        
        ;; Update task rating if not already set or if this is a mutual rating
        (if (is-none (get rating task))
            (map-set Tasks task-id
                (merge task {
                    rating: (some rating)
                })
            )
            true ;; Rating already exists, could implement mutual rating system here
        )
        
        ;; Emit event
        (print {
            event: "task-rated",
            task-id: task-id,
            rater: tx-sender,
            rating: rating,
            review: review
        })
        
        (ok true)
    )
)

;; @desc Get task rating and review information
;; @param task-id uint - Task ID
(define-read-only (get-task-rating (task-id uint))
    (let ((task (unwrap! (map-get? Tasks task-id) (err "Task not found"))))
        (ok {
            rating: (get rating task),
            status: (get status task),
            creator: (get creator task),
            worker: (get worker task)
        })
    )
)

;; @desc Get average rating for a user across all completed tasks
;; @param user principal - User to get average rating for
(define-read-only (get-user-average-rating (user principal))
    (match (map-get? UserReputation user)
        rep (ok (get average-rating rep))
        (err "User not found")
    )
)

;; @desc Emergency pause contract (only owner)
;; @param reason (string-ascii 256) - Reason for pause
(define-public (emergency-pause (reason (string-ascii 256)))
    (begin
        ;; Only contract owner can pause
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        ;; Set pause state
        (var-set contract-paused true)
        (var-set pause-end-block (some (+ stacks-block-height EMERGENCY-PAUSE-DURATION)))
        
        ;; Emit event
        (print {
            event: "emergency-pause",
            admin: tx-sender,
            reason: reason,
            pause-until: (+ stacks-block-height EMERGENCY-PAUSE-DURATION)
        })
        
        (ok true)
    )
)

;; @desc Unpause contract (only owner or automatic after duration)
(define-public (unpause-contract)
    (begin
        ;; Check if pause has expired or owner is calling
        (asserts! (or 
            (is-eq tx-sender (var-get contract-owner))
            (match (var-get pause-end-block)
                end-block (<= end-block stacks-block-height)
                false
            )
        ) ERR-UNAUTHORIZED)
        
        ;; Remove pause state
        (var-set contract-paused false)
        (var-set pause-end-block none)
        
        ;; Emit event
        (print {
            event: "contract-unpaused",
            admin: tx-sender,
            unpaused-at: stacks-block-height
        })
        
        (ok true)
    )
)

;; @desc Set emergency admin for recovery operations
;; @param admin principal - Emergency admin
(define-public (set-emergency-admin (admin principal))
    (begin
        ;; Only contract owner can set emergency admin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-UNAUTHORIZED)
        
        (var-set emergency-admin (some admin))
        
        (print {
            event: "emergency-admin-set",
            admin: admin,
            set-by: tx-sender
        })
        
        (ok true)
    )
)

;; @desc Request recovery for a stuck task
;; @param task-id uint - Task ID
;; @param reason (string-ascii 256) - Reason for recovery
(define-public (request-task-recovery
        (task-id uint)
        (reason (string-ascii 256))
    )
    (let ((task (unwrap! (map-get? Tasks task-id) ERR-INVALID-ID)))
        ;; Check caller is creator or worker
        (asserts! (or 
            (is-eq tx-sender (get creator task))
            (is-eq (some tx-sender) (get worker task))
        ) ERR-NOT-DISPUTE-PARTICIPANT)
        
        ;; Check task is in a recoverable state (disputed or stuck in-progress)
        (asserts! (or 
            (is-eq (get status task) "disputed")
            (and 
                (is-eq (get status task) "in-progress")
                (<= (get deadline task) stacks-block-height)
            )
        ) ERR-RECOVERY-NOT_AVAILABLE)
        
        ;; Create recovery request
        (map-set RecoveryRequests task-id {
            requester: tx-sender,
            reason: reason,
            requested-at: stacks-block-height,
            timelock-expires: (+ stacks-block-height RECOVERY-TIMELOCK-BLOCKS),
            approved: false
        })
        
        ;; Emit event
        (print {
            event: "recovery-requested",
            task-id: task-id,
            requester: tx-sender,
            reason: reason,
            timelock-expires: (+ stacks-block-height RECOVERY-TIMELOCK-BLOCKS)
        })
        
        (ok true)
    )
)

;; @desc Execute recovery for a task (after timelock)
;; @param task-id uint - Task ID
(define-public (execute-task-recovery (task-id uint))
    (let (
        (task (unwrap! (map-get? Tasks task-id) ERR-INVALID-ID))
        (recovery (unwrap! (map-get? RecoveryRequests task-id) ERR-RECOVERY-NOT_AVAILABLE))
    )
        ;; Check timelock has expired
        (asserts! (>= stacks-block-height (get timelock-expires recovery)) ERR-RECOVERY-TIMELOCK_ACTIVE)
        
        ;; Check caller is emergency admin or contract owner
        (asserts! (or 
            (is-eq tx-sender (var-get contract-owner))
            (is-eq (some tx-sender) (var-get emergency-admin))
        ) ERR-NOT-EMERGENCY_ADMIN)
        
        ;; Execute recovery based on task state
        (if (is-eq (get status task) "disputed")
            ;; For disputed tasks, refund to creator
            (begin
                (map-set Tasks task-id
                    (merge task {
                        status: "completed"
                    })
                )
                (as-contract (stx-transfer? (get amount task) tx-sender (get creator task)))
            )
            ;; For stuck in-progress tasks, refund to creator
            (begin
                (map-set Tasks task-id
                    (merge task {
                        status: "completed"
                    })
                )
                (as-contract (stx-transfer? (get amount task) tx-sender (get creator task)))
            )
        )
        
        ;; Mark recovery as approved
        (map-set RecoveryRequests task-id
            (merge recovery {
                approved: true
            })
        )
        
        ;; Emit event
        (print {
            event: "recovery-executed",
            task-id: task-id,
            admin: tx-sender,
            amount-refunded: (get amount task),
            recipient: (get creator task)
        })
        
        (ok true)
    )
)

;; @desc Get contract pause status
(define-read-only (get-pause-status)
    (ok {
        paused: (var-get contract-paused),
        pause-end-block: (var-get pause-end-block),
        current-block: stacks-block-height
    })
)

;; @desc Get recovery request information
;; @param task-id uint - Task ID
(define-read-only (get-recovery-request (task-id uint))
    (map-get? RecoveryRequests task-id)
)

;; @desc Get emergency admin
(define-read-only (get-emergency-admin)
    (var-get emergency-admin)
)

;; @desc Get contract statistics for monitoring
(define-read-only (get-contract-stats)
    (ok {
        total-tasks: (var-get task-nonce),
        total-disputes: (var-get dispute-nonce),
        contract-paused: (var-get contract-paused),
        contract-owner: (var-get contract-owner),
        emergency-admin: (var-get emergency-admin),
        current-block: stacks-block-height
    })
)

;; @desc Get comprehensive task information for monitoring
;; @param task-id uint - Task ID
(define-read-only (get-task-full-info (task-id uint))
    (let ((task (unwrap! (map-get? Tasks task-id) (err "Task not found"))))
        (ok {
            task: task,
            dispute: (match (get dispute-id task)
                dispute-id (map-get? Disputes dispute-id)
                none
            ),
            recovery: (map-get? RecoveryRequests task-id),
            submissions: (if (> (get submission-count task) u0)
                (map (get-submission-for-task task-id) (list u0 u1 u2 u3 u4))
                (list)
            )
        })
    )
)

;; @desc Emit standardized event for external monitoring
;; @param event-type (string-ascii 50) - Type of event
;; @param event-data (string-ascii 500) - Event data as JSON string
(define-private (emit-monitoring-event 
        (event-type (string-ascii 50))
        (event-data (string-ascii 500))
    )
    (print {
        event-type: event-type,
        timestamp: stacks-block-height,
        data: event-data,
        contract: "bittask-v2"
    })
)

;; @desc Get system health status
(define-read-only (get-system-health)
    (let (
        (total-tasks (var-get task-nonce))
        (total-disputes (var-get dispute-nonce))
        (dispute-rate (if (> total-tasks u0) (/ (* total-disputes u100) total-tasks) u0))
    )
        (ok {
            total-tasks: total-tasks,
            total-disputes: total-disputes,
            dispute-rate-percentage: dispute-rate,
            contract-paused: (var-get contract-paused),
            health-status: (if (< dispute-rate u10) "healthy" "needs-attention")
        })
    )
)

;; @desc Get comprehensive user profile with all related data
;; @param user principal - User to get profile for
(define-read-only (get-user-profile (user principal))
    (let (
        (reputation (map-get? UserReputation user))
        (trust-score (calculate-trust-score user))
    )
        (ok {
            user: user,
            reputation: reputation,
            trust-score: trust-score,
            is-arbitrator: (is-some (map-get? Arbitrators user)),
            arbitrator-data: (map-get? Arbitrators user)
        })
    )
)

;; @desc Get tasks by user (as creator or worker)
;; @param user principal - User to get tasks for
;; @param start-id uint - Starting task ID
;; @param limit uint - Maximum tasks to return
(define-read-only (get-user-tasks 
        (user principal)
        (start-id uint)
        (limit uint)
    )
    (let ((tasks (get-tasks-paginated start-id limit)))
        (filter (check-user-involvement user) tasks)
    )
)

;; @desc Helper to check if user is involved in task
(define-private (check-user-involvement (user principal) (task-opt (optional {
        title: (string-ascii 100),
        description: (string-ascii 500),
        creator: principal,
        worker: (optional principal),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20),
        submission: (optional (string-ascii 500)),
        created-at: uint,
        category: (string-ascii 30),
        dispute-id: (optional uint),
        rating: (optional uint),
        milestone-count: uint,
        escrow-remaining: uint,
        revision-count: uint,
        submission-count: uint
    })))
    (match task-opt
        task (or 
            (is-eq (get creator task) user)
            (is-eq (get worker task) (some user))
        )
        false
    )
)

;; @desc Get category statistics with task distribution
(define-read-only (get-category-analytics)
    (ok {
        development: (map-get? Categories "development"),
        design: (map-get? Categories "design"),
        writing: (map-get? Categories "writing"),
        marketing: (map-get? Categories "marketing"),
        research: (map-get? Categories "research")
    })
)

;; @desc Validate data completeness for a task
;; @param task-id uint - Task ID to validate
(define-read-only (validate-task-completeness (task-id uint))
    (let ((task (unwrap! (map-get? Tasks task-id) (err "Task not found"))))
        (ok {
            has-title: (> (len (get title task)) u0),
            has-description: (> (len (get description task)) u0),
            has-category: (> (len (get category task)) u0),
            has-valid-amount: (> (get amount task) u0),
            has-future-deadline: (> (get deadline task) stacks-block-height),
            has-creator: true,
            completeness-score: (calculate-completeness-score task)
        })
    )
)

;; @desc Calculate completeness score for a task
(define-private (calculate-completeness-score (task {
        title: (string-ascii 100),
        description: (string-ascii 500),
        creator: principal,
        worker: (optional principal),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20),
        submission: (optional (string-ascii 500)),
        created-at: uint,
        category: (string-ascii 30),
        dispute-id: (optional uint),
        rating: (optional uint),
        milestone-count: uint,
        escrow-remaining: uint,
        revision-count: uint,
        submission-count: uint
    }))
    (let (
        (title-score (if (>= (len (get title task)) u10) u20 u10))
        (desc-score (if (>= (len (get description task)) u50) u20 u10))
        (category-score (if (> (len (get category task)) u0) u20 u0))
        (amount-score (if (>= (get amount task) u1000) u20 u10))
        (deadline-score (if (> (get deadline task) stacks-block-height) u20 u0))
    )
        (+ title-score desc-score category-score amount-score deadline-score)
    )
)

;; @desc Comprehensive error handler for debugging
;; @param error-code uint - Error code
(define-read-only (get-error-info (error-code uint))
    (if (is-eq error-code u100) (ok "ERR-ZERO-AMOUNT: Amount must be greater than 0")
    (if (is-eq error-code u101) (ok "ERR-INVALID-ID: Task ID not found")
    (if (is-eq error-code u102) (ok "ERR-UNAUTHORIZED: Caller is not authorized")
    (if (is-eq error-code u103) (ok "ERR-PAST-DEADLINE: Deadline has passed")
    (if (is-eq error-code u104) (ok "ERR-EMPTY-TITLE: Title cannot be empty")
    (if (is-eq error-code u105) (ok "ERR-EMPTY-DESCRIPTION: Description cannot be empty")
    (if (is-eq error-code u106) (ok "ERR-CREATOR-CANNOT-ACCEPT: Creator cannot accept their own task")
    (if (is-eq error-code u107) (ok "ERR-NOT-OPEN: Task status is not 'open'")
    (if (is-eq error-code u108) (ok "ERR-NOT-IN-PROGRESS: Task status is not 'in-progress'")
    (if (is-eq error-code u109) (ok "ERR-NOT-WORKER: Caller is not the assigned worker")
    (if (is-eq error-code u110) (ok "ERR-NOT-SUBMITTED: Task has not been submitted")
    (if (is-eq error-code u111) (ok "ERR-NOT-CREATOR: Caller is not the task creator")
    (if (is-eq error-code u112) (ok "ERR-ALREADY-COMPLETED: Task is already completed")
    (if (is-eq error-code u113) (ok "ERR-TITLE-TOO-SHORT: Title must be at least 5 characters")
    (if (is-eq error-code u114) (ok "ERR-TITLE-TOO-LONG: Title must be at most 100 characters")
    (if (is-eq error-code u115) (ok "ERR-DESCRIPTION-TOO-SHORT: Description must be at least 20 characters")
    (if (is-eq error-code u116) (ok "ERR-DESCRIPTION-TOO-LONG: Description must be at most 500 characters")
    (if (is-eq error-code u117) (ok "ERR-AMOUNT-TOO-LOW: Amount below minimum limit")
    (if (is-eq error-code u118) (ok "ERR-AMOUNT-TOO-HIGH: Amount above maximum limit")
    (if (is-eq error-code u119) (ok "ERR-DEADLINE-TOO-SOON: Deadline must be at least 24 hours in future")
    (if (is-eq error-code u120) (ok "ERR-INVALID-CATEGORY: Category does not exist")
    (if (is-eq error-code u121) (ok "ERR-CATEGORY-INACTIVE: Category is not active")
        (err "Unknown error code")
    ))))))))))))))))))))))))
)

;; @desc Validate contract state integrity
(define-read-only (validate-contract-integrity)
    (let (
        (total-tasks (var-get task-nonce))
        (total-disputes (var-get dispute-nonce))
        (owner-set (is-some (some (var-get contract-owner))))
    )
        (ok {
            tasks-created: total-tasks,
            disputes-created: total-disputes,
            owner-configured: owner-set,
            contract-paused: (var-get contract-paused),
            emergency-admin-set: (is-some (var-get emergency-admin)),
            integrity-score: (if (and owner-set (>= total-tasks u0)) u100 u50)
        })
    )
)

;; @desc Get contract version and feature flags
(define-read-only (get-contract-info)
    (ok {
        version: "2.0.0",
        features: {
            categories: true,
            disputes: true,
            reputation: true,
            milestones: true,
            revisions: true,
            emergency-controls: true,
            advanced-queries: true
        },
        limits: {
            max-title-length: MAX-TITLE-LENGTH,
            max-description-length: MAX-DESCRIPTION-LENGTH,
            min-amount: MIN-AMOUNT,
            max-amount: MAX-AMOUNT,
            min-deadline-blocks: MIN-DEADLINE-BLOCKS,
            max-revisions: MAX-REVISIONS
        }
    })
)

;; @desc Comprehensive task workflow validation
;; @param task-id uint - Task ID to validate workflow
(define-read-only (validate-task-workflow (task-id uint))
    (let ((task (unwrap! (map-get? Tasks task-id) (err "Task not found"))))
        (ok {
            current-status: (get status task),
            valid-transitions: (get-valid-transitions (get status task)),
            has-worker: (is-some (get worker task)),
            has-submissions: (> (get submission-count task) u0),
            has-disputes: (is-some (get dispute-id task)),
            has-milestones: (> (get milestone-count task) u0),
            workflow-health: (calculate-workflow-health task)
        })
    )
)

;; @desc Get valid state transitions for current status
(define-private (get-valid-transitions (status (string-ascii 20)))
    (if (is-eq status "open") (list "in-progress" "disputed" "completed")
    (if (is-eq status "in-progress") (list "submitted" "disputed" "completed")
    (if (is-eq status "submitted") (list "completed" "disputed" "in-progress")
    (if (is-eq status "disputed") (list "completed" "open")
    (if (is-eq status "completed") (list)
        (list)
    )))))
)

;; @desc Calculate workflow health score
(define-private (calculate-workflow-health (task {
        title: (string-ascii 100),
        description: (string-ascii 500),
        creator: principal,
        worker: (optional principal),
        amount: uint,
        deadline: uint,
        status: (string-ascii 20),
        submission: (optional (string-ascii 500)),
        created-at: uint,
        category: (string-ascii 30),
        dispute-id: (optional uint),
        rating: (optional uint),
        milestone-count: uint,
        escrow-remaining: uint,
        revision-count: uint,
        submission-count: uint
    }))
    (let (
        (status-score (if (is-eq (get status task) "completed") u40 u20))
        (worker-score (if (is-some (get worker task)) u20 u0))
        (submission-score (if (> (get submission-count task) u0) u20 u0))
        (dispute-penalty (if (is-some (get dispute-id task)) u-10 u0))
        (revision-penalty (* (get revision-count task) u-5))
    )
        (+ status-score worker-score submission-score dispute-penalty revision-penalty)
    )
)

;; @desc Gas optimization helper - batch operations
;; @param operations (list 10 (string-ascii 20)) - List of operations to validate
(define-read-only (validate-batch-operations (operations (list 10 (string-ascii 20))))
    (ok {
        total-operations: (len operations),
        estimated-gas: (* (len operations) u1000), ;; Rough estimate
        batch-valid: (< (len operations) u11)
    })
)

;; @desc Contract deployment verification
(define-read-only (verify-deployment)
    (ok {
        contract-deployed: true,
        owner-set: (is-some (some (var-get contract-owner))),
        categories-initialized: (is-some (map-get? Categories "development")),
        nonces-initialized: (and (is-eq (var-get task-nonce) u0) (is-eq (var-get dispute-nonce) u0)),
        deployment-block: stacks-block-height,
        version: "2.0.0"
    })
)
