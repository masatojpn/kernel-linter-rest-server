import type {
  BillingAccessRecord,
  ResolvedPluginAccess
} from "@/lib/billing/types";

function isBetaModeEnabled(): boolean {
  if (process.env.BETA_MODE === "true") {
    return true;
  }

  return false;
}

export function resolveAccess(
  record: BillingAccessRecord | null
): ResolvedPluginAccess {
  if (record && record.manualDeny === true) {
    return {
      canUsePro: false,
      plan: "free",
      reason: "manually_blocked",
      isBeta: false,
      currentPeriodEnd: record.currentPeriodEnd,
      upgradeUrl: null,
      manageBillingUrl: null
    };
  }

  if (record && record.betaOverride === true) {
    return {
      canUsePro: true,
      plan: "pro",
      reason: "beta_override",
      isBeta: true,
      currentPeriodEnd: record.currentPeriodEnd,
      upgradeUrl: null,
      manageBillingUrl: null
    };
  }

  if (isBetaModeEnabled() === true) {
    return {
      canUsePro: true,
      plan: "pro",
      reason: "beta_mode",
      isBeta: true,
      currentPeriodEnd: record ? record.currentPeriodEnd : null,
      upgradeUrl: null,
      manageBillingUrl: null
    };
  }

  if (record && record.accessState === "active") {
    return {
      canUsePro: true,
      plan: "pro",
      reason: "active_subscription",
      isBeta: false,
      currentPeriodEnd: record.currentPeriodEnd,
      upgradeUrl: null,
      manageBillingUrl: null
    };
  }

  if (record && record.accessState === "grace") {
    return {
      canUsePro: true,
      plan: "pro",
      reason: "grace_period",
      isBeta: false,
      currentPeriodEnd: record.currentPeriodEnd,
      upgradeUrl: null,
      manageBillingUrl: null
    };
  }

  return {
    canUsePro: false,
    plan: "free",
    reason: "no_access",
    isBeta: false,
    currentPeriodEnd: record ? record.currentPeriodEnd : null,
    upgradeUrl: null,
    manageBillingUrl: null
  };
}