import type { BillingAccessRecord } from "@/lib/billing/types";

export async function getBillingAccessByUserId(
  userId: string
): Promise<BillingAccessRecord | null> {
  if (typeof userId !== "string") {
    return null;
  }

  if (userId.trim() === "") {
    return null;
  }

  const now = new Date().toISOString();

  return {
    userId,
    plan: "free",
    accessState: "inactive",
    accessSource: "none",
    betaOverride: false,
    manualDeny: false,
    currentPeriodEnd: null,
    createdAt: now,
    updatedAt: now
  };
}