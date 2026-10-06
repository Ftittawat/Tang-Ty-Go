import crypto from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "tg_session";
const MAX_AGE = 30 * 24 * 3600; // seconds

function secret() {
  const s = process.env.AUTH_SECRET || process.env.APP_PASSWORD;
  if (!s) throw new Error("APP_PASSWORD is not set");
  return s;
}

const sign = (payload: string) => crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

export function createSessionValue() {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return { value: `${exp}.${sign(exp)}`, maxAge: MAX_AGE };
}

export function isValidSession(value: string | undefined) {
  if (!value || !process.env.APP_PASSWORD) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) * 1000 < Date.now()) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function checkPassword(input: string) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Call at the top of every Server Action: actions are public endpoints. */
export async function requireAuth() {
  if (!isValidSession((await cookies()).get(SESSION_COOKIE)?.value)) throw new Error("Unauthorized");
}
