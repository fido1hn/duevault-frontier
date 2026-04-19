export type GetAuthToken = () => Promise<string | null>;

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  getAuthToken: GetAuthToken,
) {
  const accessToken = await getAuthToken();

  if (!accessToken) {
    throw new Error("Please sign in to continue.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(input, {
    ...init,
    headers,
  });
}
