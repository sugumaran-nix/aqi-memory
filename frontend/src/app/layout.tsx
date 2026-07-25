import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import OfflineBanner from "@/components/ui/OfflineBanner";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://aqi-memory.vercel.app"
  ),
  title: {
    default: "AQI Memory — India's Air Quality Archive",
    template: "%s | AQI Memory",
  },
  description:
    "Archiving readings from 560+ CPCB monitoring stations every hour. Catching silent data edits in real time. India's permanent air quality record.",
  keywords: [
    "AQI India", "air quality", "CPCB", "PM2.5", "pollution", "monitoring stations",
    "data transparency", "environment", "public health",
  ],
  authors: [{ name: "AQI Memory" }],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    siteName: "AQI Memory",
    title: "AQI Memory — India's Air Quality Archive",
    description: "560+ CPCB stations. Every reading. Forever.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "AQI Memory" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AQI Memory — India's Air Quality Archive",
    description: "560+ CPCB stations. Every reading. Forever.",
    images: ["/og.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-flash theme script — runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');})();`,
          }}
        />
      </head>
      <body>
        {/* Skip-to-content for keyboard users */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Desktop sidebar */}
        <Sidebar />

        {/* Top bar — full width mobile, sidebar-offset on desktop */}
        <TopBar />

        {/* Offline banner */}
        <OfflineBanner />

        {/* Main content area */}
        <main
          id="main-content"
          tabIndex={-1}
          className="sidebar-offset pt-[60px] pb-[56px] lg:pb-0 min-h-screen"
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        {/* Mobile bottom nav */}
        <BottomNav />

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          gutter={8}
          containerStyle={{ top: 72, right: 16 }}
          toastOptions={{ duration: 4000 }}
        />
      </body>
    </html>
  );
}
