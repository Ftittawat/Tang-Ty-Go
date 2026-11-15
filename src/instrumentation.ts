/** Runs once when the server starts: make sure Better Auth's tables exist before the first request. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { migrateAuth } = await import("@/lib/auth");
  await migrateAuth();
}
