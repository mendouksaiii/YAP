import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yap — Build apps by talking",
  description: "Speak it, see it, ship it. No keyboard required.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
