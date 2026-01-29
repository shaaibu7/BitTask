/**
 * BitTask Advanced Analytics Utility Library
 * Complex data transformations and scoring algorithms for ecosystem insight.
 */

export interface UserActivity {
    address: string;
    tasksCompleted: number;
    referrals: number;
    tokensStaked: number;
    lastActiveBlock: number;
    joinBlock: number;
}

/**
 * Calculates a proprietary "Impact Score" for a user.
 * weighted based on activity, tenure, and capital commitment (staking).
 */
export function calculateImpactScore(activity: UserActivity, currentBlock: number): number {
    const activityWeight = 0.5;
    const stakeWeight = 0.3;
    const tenureWeight = 0.2;

    const activityScore = (activity.tasksCompleted * 10) + (activity.referrals * 25);
    const stakeScore = Math.log10(activity.tokensStaked + 1) * 50;

    const blocksActive = currentBlock - activity.joinBlock;
    const tenureScore = Math.min(blocksActive / 1000, 100); // Caps at 100

    // Recency penalty: Reduces score if user hasn't been active recently
    const sleepDuration = currentBlock - activity.lastActiveBlock;
    const recencyMultiplier = Math.max(1 - (sleepDuration / 5000), 0.1);

    return (activityScore * activityWeight + stakeScore * stakeWeight + tenureScore * tenureWeight) * recencyMultiplier;
}

/**
 * Projects future staking rewards based on compound interest logic.
 */
export function projectStakingYield(
    principal: number,
    blocks: number,
    baseMultiplier: number = 1.0,
    compoundingFrequency: 'daily' | 'weekly' = 'daily'
): number {
    const blocksPerDay = 144;
    const apr = 0.12; // 12% annual base rate
    const ratePerBlock = apr / (blocksPerDay * 365);

    const compoundingBlocks = compoundingFrequency === 'daily' ? 144 : 1008;
    const periods = Math.floor(blocks / compoundingBlocks);
    const ratePerPeriod = ratePerBlock * compoundingBlocks * baseMultiplier;

    return principal * Math.pow(1 + ratePerPeriod, periods) - principal;
}

/**
 * Aggregates ecosystem trends across a dataset of user activities.
 */
export function analyzeEcosystemTrends(activities: UserActivity[]): {
    averageEngagement: number;
    retentionRate: number;
    stakingRatio: number;
} {
    if (activities.length === 0) return { averageEngagement: 0, retentionRate: 0, stakingRatio: 0 };

    const totalPoints = activities.reduce((acc, curr) => acc + curr.tasksCompleted, 0);
    const activeUsers = activities.filter(a => a.tasksCompleted > 5).length;
    const totalStaked = activities.reduce((acc, curr) => acc + curr.tokensStaked, 0);

    return {
        averageEngagement: totalPoints / activities.length,
        retentionRate: activeUsers / activities.length,
        stakingRatio: totalStaked / (activities.length * 1000) // Normalized to 1k basis
    };
}

/**
 * Assigns behavioral badges based on activity patterns.
 */
export function deriveBadges(activity: UserActivity): string[] {
    const badges: string[] = [];

    if (activity.tasksCompleted > 50) badges.push('Architect');
    if (activity.referrals > 20) badges.push('Evangelist');
    if (activity.tokensStaked > 100000) badges.push('Whale');
    if (activity.joinBlock < 100000) badges.push('OG Pioneer');

    return badges;
}
