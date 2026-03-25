import { kv } from "@vercel/kv";

const CONNECT_REQUEST_KEY_PREFIX = "kernel:connect-request:";

type ConnectRequestResult = {
  sessionToken: string;
  figmaUserId: string;
};

function getConnectRequestKey(requestId: string): string {
  return CONNECT_REQUEST_KEY_PREFIX + requestId;
}

function createCorsHeaders(): HeadersInit {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-type": "application/json; charset=utf-8"
  };
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders()
  });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId");

  if (!requestId) {
    return Response.json(
      { ok: false, error: "Missing requestId" },
      {
        status: 400,
        headers: createCorsHeaders()
      }
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
      {
        status: 200,
        headers: createCorsHeaders()
      }
    );
  }

  return Response.json(
    {
      ok: true,
      pending: false,
      sessionToken: result.sessionToken,
      figmaUserId: result.figmaUserId
    },
    {
      status: 200,
      headers: createCorsHeaders()
    }
  );
}