import type { Metadata } from 'next';
import { Cairo, Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { getStoreSettings } from '@/lib/store-data';
import { AppProvider } from '@/components/providers/AppProvider';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { GuestChatWidget } from '@/components/chat/GuestChatWidget';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    title: `${settings.store_name_ar} | ${settings.store_name_en}`,
    description: `${settings.tagline_en} — ${settings.tagline_ar}`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getStoreSettings();
  const initialDir = settings.default_language === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={settings.default_language}
      dir={initialDir}
      data-collection={settings.default_collection_theme}
      className={`${cairo.variable} ${jakarta.variable} ${cormorant.variable} ${
        settings.default_theme === 'dark' ? 'dark' : ''
      }`}
      suppressHydrationWarning
    >
      <body className="font-sans-boutique min-h-screen antialiased">
        <AppProvider initialSettings={settings}>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <GuestChatWidget />
        </AppProvider>
      </body>
    </html>
  );
}
