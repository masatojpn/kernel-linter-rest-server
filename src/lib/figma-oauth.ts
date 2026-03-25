import { env } from "@/lib/env";
import type { FigmaTokenResponse } from "@/lib/types";

const FIGMA_OAUTH_AUTHORIZE_URL = "https://www.figma.com/oauth";
const FIGMA_OAUTH_TOKEN_URL = "https://api.figma.com/v1/oauth/token";

export function buildFigmaAuthorizeUrl(state: string): string {
  const url = new URL(FIGMA_OAUTH_AUTHORIZE_URL);

  url.searchParams.set("client_id", env.FIGMA_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.FIGMA_OAUTH_REDIRECT_URI);
  url.searchParams.set("scope", "file_content:read");
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");

  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<FigmaTokenResponse> {
  const response = await fetch(FIGMA_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.FIGMA_CLIENT_ID,
      client_secret: env.FIGMA_CLIENT_SECRET,
      redirect_uri: env.FIGMA_OAUTH_REDIRECT_URI,
      code,
      grant_type: "authorization_code"
    }).toString()
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<FigmaTokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<FigmaTokenResponse> {
  const response = await fetch(FIGMA_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.FIGMA_CLIENT_ID,
      client_secret: env.FIGMA_CLIENT_SECRET,
      redirect_uri: env.FIGMA_OAUTH_REDIRECT_URI,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }).toString()
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<FigmaTokenResponse>;
}