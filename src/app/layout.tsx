import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrickHunt",
  description:
    "Check a suspicious message, link, screenshot or QR code and see the warning signs and what to do next.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
