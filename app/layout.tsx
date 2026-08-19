import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Twenty — Find the people worth knowing", template: "%s · Twenty" },
  description: "A trust-first career relationship engine that finds the 20 people you should speak to next and helps you reach out thoughtfully.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "Twenty — Who are the 20 people you should speak to next?",
    description: "Discover the right people, understand why they matter, and start better career conversations.",
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Twenty — Who are the 20 people you should speak to next?" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
