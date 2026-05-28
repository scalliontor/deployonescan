import "./globals.css";
import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Onescan — iPhone → 3D walkthrough for real estate",
  description:
    "Self-serve Gaussian Splatting for real estate. Film your listing with your iPhone, get a Matterport-quality 3D tour in 30 minutes.",
  metadataBase: new URL(process.env.PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "Onescan — iPhone → 3D walkthrough",
    description: "Matterport-quality real-estate tours from your iPhone.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
