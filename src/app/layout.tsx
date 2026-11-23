import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { FeaturesProvider } from "@/components/features";
import { ExclamationIcon } from "@/components/icons";
import { MAINTENANCE_MESSAGE } from "@/lib/features";
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
        {features.maintenance && (
          <div role="status" className="flex items-center justify-center gap-2 bg-[#ff9500] px-4 py-2 text-center text-sm font-medium text-white">
            <ExclamationIcon className="size-4 shrink-0" />
            {MAINTENANCE_MESSAGE}
            {viewer?.isSystemAdmin && <span className="font-normal opacity-90">(คุณยังแก้ไขได้ในฐานะเจ้าของระบบ)</span>}
          </div>
        )}
        <FeaturesProvider value={features}>{children}</FeaturesProvider>
      </body>
    </html>
  );
}
