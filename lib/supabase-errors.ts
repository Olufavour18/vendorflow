/**
 * Turn Supabase / Postgres errors into clear messages for admins.
 * Especially helpful when RLS blocks a read or write.
 */
export function formatSupabaseError(
  error: { message?: string; code?: string; details?: string; hint?: string } | null | undefined,
  fallback = "Something went wrong. Please try again."
): string {
  if (!error) return fallback;

  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";
  const details = (error.details || "").toLowerCase();
  const combined = `${msg} ${details} ${error.hint || ""}`;

  // Not authenticated
  if (
    code === "PGRST301" ||
    msg.includes("jwt") ||
    msg.includes("not authenticated") ||
    msg.includes("invalid claim")
  ) {
    return "You are not signed in or your session expired. Please log in again and retry.";
  }

  // RLS / permission denied (common codes & messages)
  if (
    code === "42501" ||
    code === "PGRST116" ||
    msg.includes("row-level security") ||
    msg.includes("rls") ||
    msg.includes("permission denied") ||
    msg.includes("new row violates row-level security") ||
    msg.includes("violates row-level security policy") ||
    combined.includes("policy")
  ) {
    return (
      "Permission denied by security rules (RLS). " +
      "Make sure your account has role = 'admin' in the profiles table, " +
      "and that you are still logged in."
    );
  }

  // No rows / not found (often looks like RLS when SELECT is blocked)
  if (
    code === "PGRST116" ||
    msg.includes("0 rows") ||
    msg.includes("cannot coerce") ||
    msg.includes("json object requested")
  ) {
    return (
      "Record not found or you do not have permission to view it. " +
      "If you expect it to exist, check that your profile role is 'admin'."
    );
  }

  // Unique / constraint violations
  if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
    return error.message || "This value already exists. Use a different SKU or slug.";
  }

  if (code === "23503" || msg.includes("foreign key")) {
    return (
      error.message ||
      "This item is linked to other records and cannot be changed or deleted."
    );
  }

  // Network / generic
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
    return "Network error. Check your connection and try again.";
  }

  return error.message || error.details || fallback;
}

/** True when the error is likely an RLS / permission issue */
export function isRlsError(
  error: { message?: string; code?: string; details?: string } | null | undefined
): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";
  return (
    code === "42501" ||
    code === "PGRST116" ||
    msg.includes("row-level security") ||
    msg.includes("rls") ||
    msg.includes("permission denied") ||
    msg.includes("violates row-level security")
  );
}
