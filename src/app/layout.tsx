import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import Link from "next/link";
import { AnnouncementsProvider } from "@/components/announcements";
import { FeaturesProvider } from "@/components/features";
import { ExclamationIcon } from "@/components/icons";
import { announcementsFor } from "@/lib/back-office-store";
import { getFeatures, getViewer } from "@/lib/viewer";
import "./globals.css";

// Inter (optical sizes) for Latin + numbers, Noto Sans Thai for Thai — both variable fonts.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
});

const thai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai"],
});

export const metadata: Metadata = {
  title: "Tang-Ty Go",
  description: "บอร์ดวางแผนทริปและกิจกรรมของแก๊ง",
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [features, viewer] = await Promise.all([getFeatures(), getViewer()]);
  return (
    <html lang="th" className={`${inter.variable} ${thai.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* Everyone else gets the full-screen /maintenance page instead (proxy.ts). */}
        {features.maintenance && viewer?.isSystemAdmin && (
          <div role="status" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#ff9500] px-4 py-2 text-center text-sm font-medium text-white">
            <ExclamationIcon className="size-4 shrink-0" />
            ปิดปรับปรุงอยู่ คนอื่นใช้งานไม่ได้ คุณยังใช้งานได้ในฐานะเจ้าของระบบ
            <Link href="/maintenance" className="font-normal underline opacity-90">ดูหน้าที่คนอื่นเห็น</Link>
          </div>
        )}
        <FeaturesProvider value={features}>
          <AnnouncementsProvider initial={viewer ? announcementsFor(viewer.userId) : null}>{children}</AnnouncementsProvider>
        </FeaturesProvider>
      </body>
    </html>
  );
}
