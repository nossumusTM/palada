import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Universal Downlink Video Service',
  description: 'Extracts and downloads highest quality MP4 streams from supported URLs.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="animated-bg font-sans text-white antialiased">{children}</body>
    </html>
  );
}
