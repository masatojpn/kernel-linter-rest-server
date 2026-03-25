import { kv } from "@vercel/kv";

const CONNECT_REQUEST_KEY_PREFIX = "kernel:connect-request:";

type ConnectRequestResult = {
  sessionToken: string;
  figmaUserId: string;
};

function getConnectRequestKey(requestId: string): string {
  return CONNECT_REQUEST_KEY_PREFIX + requestId;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId");

  if (!requestId) {
    return Response.json(
      { ok: false, error: "Missing requestId" },
      { status: 400 }
    );
  }

  const key = getConnectRequestKey(requestId);
  const result = await kv.get<ConnectRequestResult>(key);

  if (!result) {
    return Response.json(
      {
        ok: true,
        pending: true
      },
      { status: 200 }
    );
  }

  return Response.json(
    {
      ok: true,
      pending: false,
      sessionToken: result.sessionToken,
      figmaUserId: result.figmaUserId
    },
    { status: 200 }
  );
}