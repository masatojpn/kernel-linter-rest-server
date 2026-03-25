import { exchangeCodeForToken } from "@/lib/figma-oauth";
import {
  consumeOAuthState,
  createSession,
  saveConnectRequestResult
} from "@/lib/session";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  console.log("[callback] start", {
    hasCode: !!code,
    hasState: !!state,
    error: error
  });

  if (error) {
    return Response.json({ ok: false, error }, { status: 400 });
  }

  if (!code || !state) {
    return Response.json(
      { ok: false, error: "Missing code or state" },
      { status: 400 }
    );
  }

  const requestId = consumeOAuthState(state);

  if (!requestId) {
    return Response.json(
      { ok: false, error: "Invalid or expired OAuth state" },
      { status: 400 }
    );
  }

  console.log("[callback] oauth state consumed", {
    requestId: requestId
  });

  try {
    const token = await exchangeCodeForToken(code);

    const session = await createSession({
      figmaUserId: token.user_id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000
    });

    console.log("[callback] session created", {
      figmaUserId: session.figmaUserId,
      hasSessionToken: !!session.sessionToken,
      sessionTokenLength: session.sessionToken ? session.sessionToken.length : 0
    });

    await saveConnectRequestResult(
      requestId,
      session.sessionToken,
      session.figmaUserId
    );

    console.log("[callback] connect request result saved", {
      requestId: requestId,
      figmaUserId: session.figmaUserId,
      hasSessionToken: !!session.sessionToken
    });

    const html = `
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>Kernel OAuth Complete</title>
    <style>
      body {
        font-family: sans-serif;
        padding: 24px;
        line-height: 1.6;
      }
      pre {
        white-space: pre-wrap;
        word-break: break-all;
        padding: 12px;
        border: 1px solid #ccc;
      }
    </style>
  </head>
  <body>
    <p>認証が完了しました。このウィンドウは閉じて大丈夫です。</p>
    <pre id="debug"></pre>
    <script>
      (function () {
        var debugEl = document.getElementById("debug");

        function log(value) {
          debugEl.textContent += String(value) + "\\n";
        }

        log("callback complete");
        log("requestId saved to server");
        log("you can close this window");
      })();
    </script>
  </body>
</html>
`;

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";

    return Response.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}