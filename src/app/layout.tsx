import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appName = "DocScanner";
const appDescription = "Scan, score, and improve agent-ready developer documentation.";
const previewImage = {
  url: "/docscanner-twitter-preview.png",
  width: 1024,
  height: 537,
  alt: "DocScanner preview showing the product name and an orange score gauge.",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: appName,
  description: appDescription,
  applicationName: appName,
  icons: {
    icon: "/docscanner-icon.svg",
    shortcut: "/docscanner-icon.svg",
    apple: "/docscanner-icon.svg",
  },
  openGraph: {
    title: appName,
    description: appDescription,
    type: "website",
    siteName: appName,
    images: [previewImage],
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description: appDescription,
    images: [previewImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
      </body>
    </html>
  );
}
