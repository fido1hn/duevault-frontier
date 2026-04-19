import { NextRequest, NextResponse } from "next/server";

import { joinWaitlist } from "@/features/waitlist/service";
import type { WaitlistSignupInput } from "@/features/waitlist/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WaitlistSignupInput;
    const result = await joinWaitlist(body);

    return NextResponse.json(result, {
      status: result.alreadyJoined ? 200 : 201,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to join the waitlist.",
      },
      { status: 400 },
    );
  }
}
