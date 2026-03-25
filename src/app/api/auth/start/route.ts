import { buildFigmaAuthorizeUrl } from "@/lib/figma-oauth";
import { createOAuthState } from "@/lib/session";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId");

  if (!requestId) {
    return Response.json(
      { ok: false, error: "Missing requestId" },
      { status: 400 }
    );
  }

  const state = createOAuthState(requestId);
  const authorizeUrl = buildFigmaAuthorizeUrl(state);

  return Response.redirect(authorizeUrl, 302);
}