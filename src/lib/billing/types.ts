export type BillingPlan = "free" | "pro";

export type BillingAccessState =
  | "inactive"
  | "active"
  | "grace"
  | "beta";

export type BillingAccessSource =
  | "none"
  | "beta_mode"
  | "beta_override"
  | "stripe"
  | "manual";

export type BillingAccessRecord = {
  userId: string;
  plan: BillingPlan;
  accessState: BillingAccessState;
  accessSource: BillingAccessSource;
  betaOverride: boolean;
  manualDeny: boolean;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedPluginAccessReason =
  | "beta_mode"
  | "beta_override"
  | "active_subscription"
  | "grace_period"
  | "manually_blocked"
  | "no_access";

export type ResolvedPluginAccess = {
  canUsePro: boolean;
  plan: BillingPlan;
  reason: ResolvedPluginAccessReason;
  isBeta: boolean;
  currentPeriodEnd: string | null;
  upgradeUrl: string | null;
  manageBillingUrl: string | null;
};