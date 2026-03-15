import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2Buddy",
  description: "Real-time collaborative study platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Crimson+Pro:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Crimson Pro', serif" }}>{children}</body>
    </html>
  );
}