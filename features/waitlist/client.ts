import type {
  SerializedWaitlistSignup,
  WaitlistSignupInput,
} from "@/features/waitlist/types";

type WaitlistResponse = {
  signup?: SerializedWaitlistSignup;
  alreadyJoined?: boolean;
  error?: string;
};

export async function joinWaitlistClient(input: WaitlistSignupInput) {
  const response = await fetch("/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as WaitlistResponse;

  if (!response.ok || !payload.signup) {
    throw new Error(payload.error ?? "Unable to join the waitlist.");
  }

  return {
    signup: payload.signup,
    alreadyJoined: Boolean(payload.alreadyJoined),
  };
}
