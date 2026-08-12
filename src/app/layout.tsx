import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Skin Discovery | Fresh Facial Bar & Lash Lounge",
  description:
    "A personalized skincare discovery designed to help you understand what your skin is asking for and where your journey begins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
