import { betterAuth, type BetterAuthOptions } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

/** Google accounts that may create boards and see every board (comma-separated in ADMIN_EMAILS). */
export function isSystemAdmin(email: string | null | undefined) {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

const options = () =>
  ({
    database: db(),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        prompt: "select_account",
      },
    },
    session: { expiresIn: 30 * 24 * 3600, updateAge: 24 * 3600 },
    plugins: [nextCookies()],
  }) satisfies BetterAuthOptions;

let instance: ReturnType<typeof betterAuth<ReturnType<typeof options>>> | undefined;

/** Created on first use, not at import, so `next build` doesn't open the database. */
export function getAuth() {
  return (instance ??= betterAuth(options()));
}

/** Creates / updates Better Auth's tables (user, session, account, verification). Run at server start. */
export async function migrateAuth() {
  const { runMigrations } = await getMigrations(options());
  await runMigrations();
}

/** Any signed-in Google user (which boards they can see is decided per page / action). */
export async function sessionFromHeaders(headers: Headers) {
  return getAuth().api.getSession({ headers });
}
