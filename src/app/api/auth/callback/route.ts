import { exchangeCodeForToken } from "@/lib/figma-oauth";
import { consumeOAuthState, createSession } from "@/lib/session";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return Response.json({ ok: false, error }, { status: 400 });
  }

  if (!code || !state) {
    return Response.json({ ok: false, error: "Missing code or state" }, { status: 400 });
  }

  const validState = consumeOAuthState(state);

  if (!validState) {
    return Response.json({ ok: false, error: "Invalid or expired OAuth state" }, { status: 400 });
  }

  try {
    const token = await exchangeCodeForToken(code);

    const session = await createSession({
      figmaUserId: token.user_id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000
    });

    return Response.json({
      ok: true,
      sessionToken: session.sessionToken,
      figmaUserId: session.figmaUserId
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";

    return Response.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}