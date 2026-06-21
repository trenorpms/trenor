import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import FetchInterceptor from "./FetchInterceptor";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Trenor",
  description: "Operations Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-ink-950 text-warm-100 antialiased h-full`}>
        <FetchInterceptor />
        {children}
      </body>
    </html>
  );
}
