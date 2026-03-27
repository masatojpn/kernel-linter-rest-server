import { extractAllowedComponents } from "@/lib/allowed-components";
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
  console.log("[allowed-components] POST start");

  try {
    const sessionToken = getBearerToken(request);

    console.log("[allowed-components] auth parsed", {
      hasSessionToken: !!sessionToken,
      sessionTokenLength: sessionToken ? sessionToken.length : 0,
    });

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

    console.log("[allowed-components] session lookup", {
      found: !!session,
      figmaUserId: session ? session.figmaUserId : null,
      expiresAt: session ? session.expiresAt : null,
    });

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
      console.log("[allowed-components] body parsed", {
        hasSources: !!body && Array.isArray(body.sources),
        sourceCount: body && Array.isArray(body.sources) ? body.sources.length : 0,
      });
    } catch (error) {
      console.log("[allowed-components] invalid json body", error);

      return jsonResponse(
        {
          ok: false,
          error: "Invalid JSON body",
        },
        400
      );
    }

    const sources = normalizeSources(body.sources);

    console.log("[allowed-components] normalized sources", {
      sourceCount: sources.length,
      sources: sources,
    });

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
    const mergedSignatures = new Set<string>();
    const sourceResults: Array<{
      fileKey: string;
      pageName: string;
      count: number;
      signatureCount: number;
    }> = [];

    for (const source of sources) {
      console.log("[allowed-components] source start", {
        fileKey: source.fileKey,
        pageName: source.pageName,
      });

      console.log("[allowed-components] fetchFigmaFile start", {
        fileKey: source.fileKey,
      });

      const file = await fetchFigmaFile(session.sessionToken, source.fileKey);

      console.log("[allowed-components] fetchFigmaFile success", {
        fileKey: source.fileKey,
        hasDocument: !!file && !!file.document,
        hasComponents: !!file && !!file.components,
      });

      console.log("[allowed-components] extractAllowedComponents start", {
        fileKey: source.fileKey,
        pageName: source.pageName,
      });

      const result = extractAllowedComponents(file, source.pageName);

      console.log("[allowed-components] extractAllowedComponents success", {
        fileKey: source.fileKey,
        pageName: source.pageName,
        pageFound: result.pageFound,
        keyCount: result.keys.length,
        signatureCount: result.signatures.length,
      });

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

      for (const signature of result.signatures) {
        mergedSignatures.add(signature);
      }

      sourceResults.push({
        fileKey: source.fileKey,
        pageName: source.pageName,
        count: result.keys.length,
        signatureCount: result.signatures.length,
      });
    }

    console.log("[allowed-components] success", {
      mergedKeyCount: mergedKeys.size,
      mergedSignatureCount: mergedSignatures.size,
      sourceCount: sourceResults.length,
    });

    return jsonResponse(
      {
        ok: true,
        allowedKeys: Array.from(mergedKeys),
        allowedSignatures: Array.from(mergedSignatures),
        sources: sourceResults,
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : null;

    console.log("[allowed-components] fatal error", {
      message: message,
      stack: stack,
      debug:
        error && typeof error === "object"
          ? JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
          : String(error),
    });

    return jsonResponse(
      {
        ok: false,
        error: message,
        debug:
          error && typeof error === "object"
            ? JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
            : String(error),
      },
      500
    );
  }
}