import { env } from "@/lib/env";
import { extractAllowedComponentKeys } from "@/lib/allowed-components";
import { fetchFigmaFile } from "@/lib/figma-api";
import { getSession } from "@/lib/session";
import type { AllowedComponentsResponse, ErrorResponse } from "@/lib/types";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Cache-Control": "no-store",
  };
}

function jsonResponse(body: AllowedComponentsResponse | ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;

  const parts = auth.split(" ");
  if (parts.length !== 2) return null;
  if (parts[0] !== "Bearer") return null;

  return parts[1];
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const sessionToken = getBearerToken(request);

    if (!sessionToken) {
      return jsonResponse(
        {
          ok: false,
          error: "Missing bearer token",
        },
        401
      );
    }

    const session = await getSession(sessionToken);

    if (!session) {
      return jsonResponse(
        {
          ok: false,
          error: "Invalid session",
        },
        401
      );
    }

    const file = await fetchFigmaFile(sessionToken, env.KERNEL_DS_FILE_KEY);
    const result = extractAllowedComponentKeys(file, env.KERNEL_ALLOWED_PAGE_NAME);

    if (!result.pageFound) {
      return jsonResponse(
        {
          ok: false,
          error: "Page not found: " + env.KERNEL_ALLOWED_PAGE_NAME,
        },
        404
      );
    }

    return jsonResponse(
      {
        ok: true,
        fileKey: env.KERNEL_DS_FILE_KEY,
        pageName: env.KERNEL_ALLOWED_PAGE_NAME,
        allowedKeys: result.keys,
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return jsonResponse(
      {
        ok: false,
        error: message,
      },
      500
    );
  }
}