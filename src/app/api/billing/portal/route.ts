import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Billing portal is not implemented yet",
      },
    },
    { status: 501 }
  );
}