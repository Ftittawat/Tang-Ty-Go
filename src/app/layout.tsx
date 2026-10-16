import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${inter.variable} ${thai.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
