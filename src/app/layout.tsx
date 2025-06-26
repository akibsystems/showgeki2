import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider, ToastProvider, SWRProvider } from "@/contexts";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mulmocast GUI",
  description: "Browser-based GUI for mulmocast video generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProvider>
          <SWRProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SWRProvider>
        </AppProvider>
      </body>
    </html>
  );
}
