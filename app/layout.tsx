import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'عيادات التجميل والأسنان | حجز موعد',
  description: 'احجز موعدك الطبي والتجميلي بسهولة وسرعة',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-100 text-slate-800 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
