"use client";

import { useState } from "react";
import { ghostBtn } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.5 5.5 0 0 1-2.4 3.62v3h3.88c2.27-2.1 3.57-5.18 3.57-8.65Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3a7.2 7.2 0 0 1-10.73-3.78H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.32 14.32a7.2 7.2 0 0 1 0-4.64v-3.1H1.3a12 12 0 0 0 0 10.84l4.02-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.8l3.44-3.44A12 12 0 0 0 1.3 6.58l4.02 3.1A7.17 7.17 0 0 1 12 4.77Z" />
    </svg>
  );
}

export function GoogleSignIn({ next = "/" }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setPending(true);
    setError(null);
    // Full-page redirect to Google; failures (e.g. not invited) come back as /login?error=…
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next, errorCallbackURL: "/login" });
    if (error) {
      setError(error.message ?? "เชื่อมต่อ Google ไม่สำเร็จ");
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <button onClick={signIn} disabled={pending} className={`${ghostBtn} w-full py-2.5`}>
        <GoogleLogo className="size-[18px]" />
        {pending ? "กำลังไปที่ Google…" : "เข้าสู่ระบบด้วย Google"}
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
