import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

// Render pages per request so Firebase Hosting's CDN never caches HTML/RSC
// (Next.js otherwise sends `s-maxage=31536000` for static pages). A cached page
// outlives each Web deploy and keeps referencing deleted `/_next/static` chunks,
// and authenticated pages would be stored at the edge keyed by `__session`.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ระบบพนักงาน C.K.ACE",
  description: "ระบบบริหารงานบุคคลและบริการพนักงาน C.K.ACE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
