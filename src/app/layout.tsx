import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import AuthGate from "@/components/auth/AuthGate";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Raksha-Drishti · State Police Department",
    template: "%s · Raksha-Drishti",
  },
  description:
    "Official crime analytics and investigation portal of the State Police Department.",
};

// Render every device at a fixed desktop width and let the browser scale the
// page to fit the screen. This makes phones show the SAME desktop layout as a
// zoomed-out "mini desktop" instead of reflowing into a separate mobile design.
// (No maximumScale / userScalable limits, so pinch-zoom still works.)
export const viewport: Viewport = {
  width: 1280,
  initialScale: undefined,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader />
        <div id="main-content" className="flex-1">
          <AuthGate>{children}</AuthGate>
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
