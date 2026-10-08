import type { Metadata } from 'next';

import { APP_NAME } from '@/lib/config';

import './globals.css';

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'A synthetic team demo for family support in Kazakhstan.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
