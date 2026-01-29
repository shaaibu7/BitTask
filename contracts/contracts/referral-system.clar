;; Referral System Contract
;; Tracks referrals and manages referral points for BitTask users.

;; Error Constants
(define-constant ERR-UNAUTHORIZED (err u401))
(define-constant ERR-ALREADY-REGISTERED (err u402))
(define-constant ERR-SELF-REFERRAL (err u403))
(define-constant ERR-NOT-FOUND (err u404))

;; Data Maps
;; Map of user to their referrer
(define-map Referrers
    principal ;; User
    principal ;; Referrer
)

;; Map of user to their referral statistics
(define-map ReferralStats
    principal ;; User
    {
        total-referrals: uint,
        total-points: uint,
        last-activity: uint
    }
)

;; Public Functions

;; @desc Register a referrer for the tx-sender.
;; @param referrer principal - The principal who referred the sender.
(define-public (register-referrer (referrer principal))
    (begin
        ;; Check if already has a referrer
        (asserts! (is-none (map-get? Referrers tx-sender)) ERR-ALREADY-REGISTERED)
        
        ;; Check if not self-referral
        (asserts! (not (is-eq tx-sender referrer)) ERR-SELF-REFERRAL)
        
        ;; Set referrer for sender
        (map-set Referrers tx-sender referrer)
        
        ;; Update stats for referrer
        (let ((stats (default-to { total-referrals: u0, total-points: u0, last-activity: u0 }
                                (map-get? ReferralStats referrer))))
            (map-set ReferralStats referrer 
                (merge stats { 
                    total-referrals: (+ (get total-referrals stats) u1),
                    last-activity: stacks-block-height
                })
            )
        )
        
        (ok true)
    )
)

;; @desc Add referral points to a user.
;; @param user principal - The user gaining points.
;; @param amount uint - The number of points to add.
(define-public (add-points (user principal) (amount uint))
    (begin
        ;; In a production environment, this would be restricted to authorized contracts
        ;; For now, we'll allow it for demo purposes or implement a simple check later
        (let ((stats (default-to { total-referrals: u0, total-points: u0, last-activity: u0 }
                                (map-get? ReferralStats user))))
            (map-set ReferralStats user
                (merge stats {
                    total-points: (+ (get total-points stats) amount),
                    last-activity: stacks-block-height
                })
            )
            (ok true)
        )
    )
)

;; Read-only functions

;; @desc Get the referrer of a user.
(define-read-only (get-referrer (user principal))
    (map-get? Referrers user)
)

;; @desc Get referral stats for a user.
(define-read-only (get-stats (user principal))
    (default-to { total-referrals: u0, total-points: u0, last-activity: u0 }
                (map-get? ReferralStats user))
)

;; @desc Check if a user is registered as a referrer.
(define-read-only (is-referrer (user principal))
    (is-some (map-get? ReferralStats user))
)
