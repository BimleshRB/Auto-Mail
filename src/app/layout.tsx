import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auto Mail | AI Job Outreach Automation",
  description: "Accelerate your job search with Auto Mail. Intelligent cold email automation platform powered by Generative AI. Send personalized outreach to tech recruiters at scale.",
  verification: {
    google: "AQC-jPC8Om9Dohea9wvTZIb_9SybnHC5r9CDvulc3uU",
  },
  keywords: ["job search automation", "cold email", "auto mail", "gemini ai", "career progression"],
  openGraph: {
    title: "Auto Mail | AI Job Outreach Platform",
    description: "Cold reach automation utilizing Gemini AI designed for high success job applications.",
    type: "website",
    url: "https://auto-mail.bimlesh.in", // Assuming domain placeholder based on user project name
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Auto Mail | AI Job Outreach Platform",
    description: "Cold reach automation utilizing Gemini AI designed for high success job applications.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
