import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleSignIn } from "@/components/google-sign-in";
import { Logo } from "@/components/ui";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "เข้าสู่ระบบ · Tang-Ty Go" };

/** Only same-site paths, so ?next= can't send people to another site after signing in. */
const safeNext = (v: unknown) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/");

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const next = safeNext(params.next);
  if (await getViewer()) redirect(next);
  const code = params.error;
  const error = typeof code === "string" ? "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง" : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-b from-[#bcd8ff] via-[#eef2f8] to-[#c6efd6] px-4">
      <span aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-144 -translate-x-1/2 rounded-full bg-sky-400/35 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-112 rounded-full bg-[#ffcc00]/25 blur-3xl" />
      <div className="relative w-full max-w-sm space-y-5 rounded-4xl bg-white/80 p-8 shadow-lift ring-1 ring-black/4 backdrop-blur-xl">
        <div className="text-center">
          <Logo className="mx-auto size-28 shadow-lift" />
          <h1 className="sr-only">Tang-Ty Go</h1>
          <p className="mt-5 text-xl font-semibold">ยินดีต้อนรับ</p>
          <p className="mt-1 text-sm text-slate-500">{next.startsWith("/join/") ? "ต้องเข้าสู่ระบบ เพื่อดำเนินการต่อ" : "Tang-Ty Go"}</p>
        </div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <GoogleSignIn next={next} />
      </div>
    </main>
  );
}
