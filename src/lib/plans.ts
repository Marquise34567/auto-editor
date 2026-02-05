export type PlanId = 'free' | 'starter' | 'creator' | 'studio';

export interface PlanLimits {
  rendersPerMonth: number;
  maxVideoLengthMinutes: number;
  exportQuality: '720p' | '1080p' | '4k';
  hasWatermark: boolean;
  queuePriority: 'standard' | 'priority' | 'ultra';
  teamFeatures: boolean;
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    rendersPerMonth: 12,
    maxVideoLengthMinutes: 10,
    exportQuality: '720p',
    hasWatermark: true,
    queuePriority: 'standard',
    teamFeatures: false,
    apiAccess: false,
  },
  starter: {
    rendersPerMonth: 20,
    maxVideoLengthMinutes: 30,
    exportQuality: '1080p',
    hasWatermark: false,
    queuePriority: 'standard',
    teamFeatures: false,
    apiAccess: false,
  },
  creator: {
    rendersPerMonth: 100,
    maxVideoLengthMinutes: 120,
    exportQuality: '4k',
    hasWatermark: false,
    queuePriority: 'priority',
    teamFeatures: false,
    apiAccess: false,
  },
  studio: {
    rendersPerMonth: 999999, // unlimited
    maxVideoLengthMinutes: 999,
    exportQuality: '4k',
    hasWatermark: false,
    queuePriority: 'ultra',
    teamFeatures: true,
    apiAccess: true,
  },
};

export const STRIPE_PRICE_LOOKUP_KEYS: Record<Exclude<PlanId, 'free'>, string> = {
  starter: 'starter_monthly',
  creator: 'creator_monthly',
  studio: 'studio_monthly',
};
