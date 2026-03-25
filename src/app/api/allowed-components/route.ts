import { extractAllowedComponentKeys } from "@/lib/allowed-components";
import { fetchFigmaFile } from "@/lib/figma-api";
import { getSession } from "@/lib/session";
import type {
  AllowedComponentsRequest,
  AllowedComponentsResponse,
  AllowedSource,
  ErrorResponse,
} from "@/lib/types";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Cache-Control": "no-store",
  };
}

function jsonResponse(body: AllowedComponentsResponse | ErrorResponse | Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
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

function normalizeSources(input: unknown): AllowedSource[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const result: AllowedSource[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const fileKey =
      "fileKey" in item && typeof item.fileKey === "string"
        ? item.fileKey.trim()
        : "";

    const pageName =
      "pageName" in item && typeof item.pageName === "string"
        ? item.pageName.trim()
        : "";

    if (!fileKey || !pageName) {
      continue;
    }

    result.push({
      fileKey,
      pageName,
    });
  }

  return result;
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(request: Request): Promise<Response> {
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

    let body: AllowedComponentsRequest;

    try {
      body = (await request.json()) as AllowedComponentsRequest;
    } catch {
      return jsonResponse(
        {
          ok: false,
          error: "Invalid JSON body",
        },
        400
      );
    }

    const sources = normalizeSources(body.sources);

    if (sources.length === 0) {
      return jsonResponse(
        {
          ok: false,
          error: "No valid sources",
        },
        400
      );
    }

    const mergedKeys = new Set<string>();
    const sourceResults: Array<{
      fileKey: string;
      pageName: string;
      count: number;
    }> = [];

    for (const source of sources) {
      const file = await fetchFigmaFile(sessionToken, source.fileKey);
      const result = extractAllowedComponentKeys(file, source.pageName);

      if (!result.pageFound) {
        return jsonResponse(
          {
            ok: false,
            error: "Page not found: " + source.pageName,
            fileKey: source.fileKey,
            pageName: source.pageName,
          },
          404
        );
      }

      for (const key of result.keys) {
        mergedKeys.add(key);
      }

      sourceResults.push({
        fileKey: source.fileKey,
        pageName: source.pageName,
        count: result.keys.length,
      });
    }

    return jsonResponse(
      {
        ok: true,
        allowedKeys: Array.from(mergedKeys),
        sources: sourceResults,
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