export type SerializedWaitlistSignup = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  useCase: string | null;
  source: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type WaitlistSignupInput = {
  email: string;
  name?: string;
  company?: string;
  useCase?: string;
  source?: string;
};

export type WaitlistSignupResult = {
  signup: SerializedWaitlistSignup;
  alreadyJoined: boolean;
};
