import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'missAV Explorer',
  description: 'Browse and search videos from missav.ws',
};

import NavBar from '@/components/NavBar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
