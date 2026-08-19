import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Blueprint';

export const metadata: Metadata = {
  title: appName,
  description: 'Internal AI Meeting Co-Pilot & Business Intelligence Platform',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-charcoal text-offwhite antialiased">{children}</body>
    </html>
  );
}
