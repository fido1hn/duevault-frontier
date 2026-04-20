type JwtClaims = Record<string, unknown>;

export function isDebugFlagEnabled(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes(value?.toLowerCase() ?? "");
}

export function describePrivyAccessToken(token: string | null | undefined) {
  const trimmedToken = token?.trim();

  if (!trimmedToken) {
    return {
      present: false,
    };
  }

  const parts = trimmedToken.split(".");
  const claims = parts.length === 3 ? decodeJwtClaims(parts[1]) : null;
  const expiresAtSeconds = getNumberClaim(claims, "exp");
  const secondsUntilExpiration =
    typeof expiresAtSeconds === "number"
      ? expiresAtSeconds - Math.floor(Date.now() / 1000)
      : null;

  return {
    present: true,
    preview: redactAccessToken(trimmedToken),
    length: trimmedToken.length,
    jwtSegments: parts.length,
    claimsDecoded: Boolean(claims),
    issuer: getStringClaim(claims, "iss"),
    audience: getAudienceClaim(claims),
    subject: getStringClaim(claims, "sub"),
    userId: getStringClaim(claims, "user_id"),
    appId: getStringClaim(claims, "app_id"),
    issuedAt: formatUnixSeconds(getNumberClaim(claims, "iat")),
    notBefore: formatUnixSeconds(getNumberClaim(claims, "nbf")),
    expiresAt: formatUnixSeconds(expiresAtSeconds),
    secondsUntilExpiration,
    expired:
      typeof secondsUntilExpiration === "number"
        ? secondsUntilExpiration <= 0
        : null,
  };
}

export function getPrivyAccessTokenSubject(token: string | null | undefined) {
  const trimmedToken = token?.trim();
  const parts = trimmedToken?.split(".");

  if (parts?.length !== 3) {
    return null;
  }

  const claims = decodeJwtClaims(parts[1]);

  return getStringClaim(claims, "sub") ?? getStringClaim(claims, "user_id");
}

function redactAccessToken(token: string) {
  if (token.length <= 16) {
    return `${token.slice(0, 4)}...`;
  }

  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

function decodeJwtClaims(payloadSegment: string): JwtClaims | null {
  const decodedPayload = decodeBase64Url(payloadSegment);

  if (!decodedPayload) {
    return null;
  }

  try {
    const parsedPayload: unknown = JSON.parse(decodedPayload);

    if (
      typeof parsedPayload === "object" &&
      parsedPayload !== null &&
      !Array.isArray(parsedPayload)
    ) {
      return parsedPayload as JwtClaims;
    }
  } catch {
    return null;
  }

  return null;
}

function decodeBase64Url(value: string) {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedValue =
    normalizedValue + "=".repeat((4 - (normalizedValue.length % 4)) % 4);

  try {
    const decodedValue = globalThis.atob(paddedValue);
    const bytes = Uint8Array.from(decodedValue, (character) =>
      character.charCodeAt(0),
    );

    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function getStringClaim(claims: JwtClaims | null, claim: string) {
  const value = claims?.[claim];

  return typeof value === "string" ? value : null;
}

function getNumberClaim(claims: JwtClaims | null, claim: string) {
  const value = claims?.[claim];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getAudienceClaim(claims: JwtClaims | null) {
  const value = claims?.aud;

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    return value;
  }

  return null;
}

function formatUnixSeconds(value: number | null) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}
