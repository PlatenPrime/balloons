/** Resolve post-login navigation target from React Router location.state. */
export function resolveLoginRedirect(
  state: unknown,
  fallback = '/sales',
  loginPath = '/login',
): string {
  if (
    state &&
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof (state as { from: unknown }).from === 'string'
  ) {
    const from = (state as { from: string }).from;
    if (from.length > 0 && from !== loginPath) return from;
  }
  return fallback;
}
