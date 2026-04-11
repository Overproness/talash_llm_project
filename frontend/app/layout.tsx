import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TALASH — Smart HR Recruitment",
  description: "AI-powered talent acquisition and candidate analysis system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
