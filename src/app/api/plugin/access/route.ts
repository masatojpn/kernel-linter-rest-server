import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth/resolve-session";
import { getBillingAccessByUserId } from "@/lib/billing/access-repository";
import { resolveAccess } from "@/lib/billing/resolve-access";

function createCorsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function getSessionTokenFromRequest(request: Request): string {
  const url = new URL(request.url);
  const sessionToken = url.searchParams.get("sessionToken");

  if (!sessionToken) {
    return "";
  }

  return sessionToken;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: createCorsHeaders()
  });
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
        status: 400,
        headers: createCorsHeaders()
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
        status: 401,
        headers: createCorsHeaders()
      }
    );
  }

  const billingAccess = await getBillingAccessByUserId(sessionUser.userId);
  const resolved = resolveAccess(billingAccess);

  return NextResponse.json(
    {
      ok: true,
      data: resolved
    },
    {
      headers: createCorsHeaders()
    }
  );
}