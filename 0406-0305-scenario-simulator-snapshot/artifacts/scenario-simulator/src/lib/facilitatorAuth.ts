/** Headers for facilitator APIs (cookie session and/or ?token= link). */
export function facilitatorAuthHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  if (typeof window === "undefined") return { ...extra };
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || params.get("facilitatorToken");
  if (token) {
    return { ...extra, "x-facilitator-token": token };
  }
  return { ...extra };
}
