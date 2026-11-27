
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Skin Discovery | Fresh Facial Bar & Lash Lounge",
  description:
    "A personalized skincare discovery designed to help you understand what your skin is asking for and where your journey begins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-0DJ7QK1YK3"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-0DJ7QK1YK3');
          `}
        </Script>
      </body>
    </html>
  );
}

