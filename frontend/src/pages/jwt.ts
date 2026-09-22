/*
 * Decodes the base64url-encoded payload of a JWT without verifying
 * its signature. Used only to read our own userId back out of the
 * token we already hold, so we can figure out which participant
 * entry in a server roster is "me".
 */
export function decodeJwtPayload<T = any>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

    return JSON.parse(atob(base64)) as T;
  } catch (error) {
    console.error("Unable to decode token", error);

    return null;
  }
}

export function getUserIdFromStoredToken(): number | null {
  const token = localStorage.getItem("token");

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload<{ userId: number }>(token);

  return payload?.userId ?? null;
}
