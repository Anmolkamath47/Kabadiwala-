import { User, IUser, TrustTier } from '../models/User.js';
import { Order } from '../models/Order.js';

export interface UserReliabilityReport {
  userId: string;
  phone: string;
  name: string;
  trustScore: number; // 0 - 100
  starRating: number; // 1.0 - 5.0
  trustTier: TrustTier;
  tierLabel: string;
  badge: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  cancellationRate: number; // 0 - 100%
  completionRate: number; // 0 - 100%
  isCooldownActive: boolean;
  cooldownRemainingMinutes: number;
  cooldownUntil: Date | null;
  dealerFeedback: {
    count: number;
    averageScore: number;
  };
  policyGuidelines: string[];
}

export class UserReliabilityService {
  /**
   * Evaluates if a customer is currently eligible to place a new scrap pickup booking.
   * Enforces:
   * 1. 15-minute anti-spam booking cooldown (triggered after 3 rapid cancels or 2 mid-route cancels)
   * 2. Concurrent order lock (prevents simultaneously flooding multiple dealers)
   */
  static async checkBookingEligibility(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) return;

    // 1. Check Booking Cooldown
    if (user.bookingCooldownUntil && new Date(user.bookingCooldownUntil) > new Date()) {
      const remainingMs = new Date(user.bookingCooldownUntil).getTime() - Date.now();
      const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
      const remainingMin = Math.ceil(remainingSec / 60);

      throw new Error(
        `Booking is temporarily paused for ${remainingMin} more minute(s) due to multiple recent cancellations. ` +
        `This policy protects scrap dealer partners from spam bookings and wasted travel time.`
      );
    }

    // 2. Check Concurrent In-Progress Orders (Anti-Flooding)
    const activeOrder = await Order.findOne({
      consumerId: userId,
      status: { $in: ['PENDING', 'ACCEPTED', 'DEALER_EN_ROUTE', 'ARRIVED'] },
    }).lean();

    if (activeOrder) {
      const dealerName = activeOrder.dealerSnapshot?.businessName || 'a scrap dealer';
      throw new Error(
        `You already have an active scrap pickup order in progress (#${activeOrder.orderId} with ${dealerName}). ` +
        `Please wait for it to complete or cancel it before booking another dealer.`
      );
    }
  }

  /**
   * Called immediately when a new pickup order is placed.
   */
  static async onOrderCreated(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) return;

    user.totalOrders = (user.totalOrders || 0) + 1;
    await user.save();
  }

  /**
   * Called when a pickup is successfully verified and completed at the doorstep.
   * Rewards the user with +6 trust points, decays penalties, and updates rating.
   */
  static async onOrderCompleted(userId: string): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    user.completedOrders = (user.completedOrders || 0) + 1;

    // Trust score boost for successful transaction (+6 points, cap at 100)
    user.trustScore = Math.min(100, (user.trustScore ?? 100) + 6);

    // Filter out cancellations older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    user.recentCancellations = (user.recentCancellations || []).filter(
      (c) => new Date(c.cancelledAt) > oneDayAgo
    );

    // If cooldown has expired, reset it
    if (user.bookingCooldownUntil && new Date(user.bookingCooldownUntil) <= new Date()) {
      user.bookingCooldownUntil = null;
    }

    this.recalculateScores(user);
    await user.save();
    return user;
  }

  /**
   * Called when an order is cancelled by the consumer.
   * Applies stage-weighted penalty based on whether dealer had already accepted or started travelling.
   */
  static async onOrderCancelled(
    userId: string,
    orderId: string,
    statusAtCancellation: string,
    reason?: string
  ): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    user.cancelledOrders = (user.cancelledOrders || 0) + 1;

    // 1. Calculate stage-weighted penalty
    let penalty = 4; // Default early cancellation (PENDING)
    if (statusAtCancellation === 'ACCEPTED') {
      penalty = 12; // Dealer accepted and prepared
    } else if (statusAtCancellation === 'DEALER_EN_ROUTE') {
      penalty = 18; // Dealer already on the road burning fuel & time
    } else if (statusAtCancellation === 'ARRIVED') {
      penalty = 25; // Doorstep cancellation after dealer reached
    }

    user.trustScore = Math.max(0, (user.trustScore ?? 100) - penalty);

    // 2. Track in recent cancellations list
    user.recentCancellations = user.recentCancellations || [];
    user.recentCancellations.push({
      orderId,
      cancelledAt: new Date(),
      orderStatusAtCancellation: statusAtCancellation,
      reason: reason || 'Cancelled by consumer',
    });

    // 3. Spam & Cooldown Detection (Last 1 hour window)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent1h = user.recentCancellations.filter(
      (c) => new Date(c.cancelledAt) > oneHourAgo
    );
    const recentEnRouteCancels = recent1h.filter((c) =>
      ['ACCEPTED', 'DEALER_EN_ROUTE', 'ARRIVED'].includes(c.orderStatusAtCancellation)
    );

    // Trigger 15-minute booking cooldown if:
    // - 3 cancellations within 1 hour, OR
    // - 2 cancellations within 1 hour when at least 1 was after dealer was en-route/accepted
    if (recent1h.length >= 3 || (recent1h.length >= 2 && recentEnRouteCancels.length >= 1)) {
      user.bookingCooldownUntil = new Date(Date.now() + 15 * 60 * 1000);
      console.warn(
        `🚨 [UserReliability] 15-minute booking cooldown triggered for user ${userId} ` +
        `(${recent1h.length} total cancels, ${recentEnRouteCancels.length} mid-route in last hour)`
      );
    }

    this.recalculateScores(user);
    await user.save();
    return user;
  }

  /**
   * Record dealer rating and feedback for the consumer after an order.
   */
  static async addDealerRatingToConsumer(
    userId: string,
    score: number,
    _feedback?: string,
    _tags?: string[]
  ): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    user.dealerRatingsCount = (user.dealerRatingsCount || 0) + 1;
    user.dealerRatingsTotal = (user.dealerRatingsTotal || 0) + Math.max(1, Math.min(5, score));

    this.recalculateScores(user);
    await user.save();
    return user;
  }

  /**
   * Recalculates star rating, cancellation rate percentage, and trust tier.
   */
  private static recalculateScores(user: IUser): void {
    const total = user.totalOrders || 0;
    const cancelled = user.cancelledOrders || 0;

    // Cancellation percentage
    user.cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    // Star rating (1.0 to 5.0)
    // Combines system trust score (0-100 translated to 1-5) and dealer ratings (if any)
    const baseScoreStar = ((user.trustScore ?? 100) / 100) * 4 + 1; // 100 -> 5.0, 50 -> 3.0, 0 -> 1.0

    if (user.dealerRatingsCount && user.dealerRatingsCount > 0) {
      const avgDealerRating = user.dealerRatingsTotal / user.dealerRatingsCount;
      // 50% system order history + 50% dealer direct ratings
      user.starRating = Math.round(((baseScoreStar * 0.5) + (avgDealerRating * 0.5)) * 10) / 10;
    } else {
      user.starRating = Math.round(baseScoreStar * 10) / 10;
    }
    user.starRating = Math.max(1.0, Math.min(5.0, user.starRating));

    // Assign Trust Tier
    const score = user.trustScore ?? 100;
    if (score >= 85) {
      user.trustTier = 'EXCELLENT';
    } else if (score >= 70) {
      user.trustTier = 'GOOD';
    } else if (score >= 50) {
      user.trustTier = 'WARNING';
    } else {
      user.trustTier = 'RESTRICTED';
    }
  }

  /**
   * Generate user reliability summary for consumer and dealer apps
   */
  static async getUserReliabilityReport(userId: string): Promise<UserReliabilityReport | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    const total = user.totalOrders || 0;
    const completed = user.completedOrders || 0;
    const cancelled = user.cancelledOrders || 0;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    const isCooldownActive = Boolean(
      user.bookingCooldownUntil && new Date(user.bookingCooldownUntil) > new Date()
    );
    const cooldownRemainingMinutes = isCooldownActive
      ? Math.ceil((new Date(user.bookingCooldownUntil!).getTime() - Date.now()) / (60 * 1000))
      : 0;

    let tierLabel = 'Trusted Scrap Seller';
    let badge = '🛡️ Verified Top Seller';
    if (user.trustTier === 'GOOD') {
      tierLabel = 'Reliable Customer';
      badge = '⭐ Verified Customer';
    } else if (user.trustTier === 'WARNING') {
      tierLabel = 'Caution: High Cancellations';
      badge = '⚠️ Account Under Notice';
    } else if (user.trustTier === 'RESTRICTED') {
      tierLabel = 'Restricted Due to Abuse';
      badge = '🚫 Restricted Account';
    }

    return {
      userId: user._id.toString(),
      phone: user.phone,
      name: user.name || 'Scrap Seller',
      trustScore: user.trustScore ?? 100,
      starRating: user.starRating ?? 5.0,
      trustTier: user.trustTier || 'EXCELLENT',
      tierLabel,
      badge,
      totalOrders: total,
      completedOrders: completed,
      cancelledOrders: cancelled,
      cancellationRate,
      completionRate,
      isCooldownActive,
      cooldownRemainingMinutes,
      cooldownUntil: user.bookingCooldownUntil || null,
      dealerFeedback: {
        count: user.dealerRatingsCount || 0,
        averageScore:
          user.dealerRatingsCount && user.dealerRatingsCount > 0
            ? Math.round((user.dealerRatingsTotal / user.dealerRatingsCount) * 10) / 10
            : 5.0,
      },
      policyGuidelines: [
        'Complete scheduled pickups to increase your Trust Score and earn 10% scrap rewards.',
        'Avoid cancelling after a dealer is en route (incurring a 15-point reliability penalty).',
        'Three cancellations within an hour trigger a 15-minute booking cooldown.',
        'Keep scrap items segregated and ready at your doorstep for fastest weighment.',
      ],
    };
  }
}
