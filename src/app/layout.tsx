import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';
import { SnackbarProvider } from '@/context/SnackbarProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'sglapp - Collectible Cards Management',
  description: 'sglapp - Professional admin panel for managing collectible cards ecosystem',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <LanguageProvider>
          <SnackbarProvider>
            {children}
          </SnackbarProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
