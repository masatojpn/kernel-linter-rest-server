import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth/resolve-session";
import { getBillingAccessByUserId } from "@/lib/billing/access-repository";
import { resolveAccess } from "@/lib/billing/resolve-access";

function getSessionTokenFromRequest(request: Request): string {
  const url = new URL(request.url);
  const sessionToken = url.searchParams.get("sessionToken");

  if (!sessionToken) {
    return "";
  }

  return sessionToken;
}

export async function GET(request: Request) {
  const sessionToken = getSessionTokenFromRequest(request);

  if (sessionToken === "") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SESSION_TOKEN_REQUIRED",
          message: "sessionToken is required"
        }
      },
      {
        status: 400
      }
    );
  }

  const sessionUser = await resolveSessionUser(sessionToken);

  if (!sessionUser) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid session"
        }
      },
      {
        status: 401
      }
    );
  }

  const billingAccess = await getBillingAccessByUserId(sessionUser.userId);
  const resolved = resolveAccess(billingAccess);

  return NextResponse.json({
    ok: true,
    data: resolved
  });
}