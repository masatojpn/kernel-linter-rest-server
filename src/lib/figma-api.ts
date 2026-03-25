import { refreshAccessToken } from "@/lib/figma-oauth";
import { getSession, updateSession } from "@/lib/session";

const FIGMA_API_BASE = "https://api.figma.com/v1";

type FigmaFileResponse = {
  name: string;
  document: FigmaNode;
  components?: Record<string, { key: string; name: string }>;
  componentSets?: Record<string, { key: string; name: string }>;
};

export type FigmaNode = {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];

  // 一部ノードで来る
  key?: string;
  componentId?: string;
};

function isExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt - 30_000;
}

async function getValidAccessToken(sessionToken: string): Promise<string> {
  const session = await getSession(sessionToken);

  if (!session) {
    throw new Error("Unauthorized: session not found");
  }

  if (!isExpired(session.expiresAt)) {
    return session.accessToken;
  }

  const refreshed = await refreshAccessToken(session.refreshToken);

  await updateSession(sessionToken, {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresAt: Date.now() + refreshed.expires_in * 1000,
    figmaUserId: refreshed.user_id
  });

  return refreshed.access_token;
}

export async function fetchFigmaFile(sessionToken: string, fileKey: string): Promise<FigmaFileResponse> {
  const accessToken = await getValidAccessToken(sessionToken);

  const url = `${FIGMA_API_BASE}/files/${fileKey}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Figma file: ${response.status} ${text}`);
  }

  return response.json() as Promise<FigmaFileResponse>;
}