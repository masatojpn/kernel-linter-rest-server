import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Checkout is not implemented yet",
      },
    },
    { status: 501 }
  );
}