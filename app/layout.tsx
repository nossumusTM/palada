import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Downlink - Universal Download Service',
  description: 'Extracts and downloads highest quality MP4 streams from supported URLs.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans text-white antialiased">{children}</body>
    </html>
  );
}
