export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    service: "kernel-linter-rest-server"
  });
}