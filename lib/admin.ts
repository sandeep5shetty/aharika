export const ADMIN_EMAIL = "sandy@gmail.com";

export function isAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}
