/**
 * Returns true for email/password (or other real) accounts.
 * Anonymous sessions must not count as "logged in" for UI.
 */
export function isRealUser(user) {
  return Boolean(user && !user.isAnonymous);
}
