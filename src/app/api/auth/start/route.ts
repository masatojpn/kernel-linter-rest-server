import { buildFigmaAuthorizeUrl } from "@/lib/figma-oauth";
import { createOAuthState } from "@/lib/session";

export async function GET(): Promise<Response> {
  const state = createOAuthState();
  const url = buildFigmaAuthorizeUrl(state);

  return Response.redirect(url, 302);
}