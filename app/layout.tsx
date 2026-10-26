import type { Metadata } from 'next';
import './globals.css';
import { siteUrl, indexable } from '../lib/site';
export const dynamic = 'force-dynamic';
export function generateMetadata(): Metadata { return {
  metadataBase: new URL(siteUrl()),
  title: 'HiramShot Camera Rentals — Borrow the gear. Own the moment.',
  description: 'Rent an Insta360 X5, Insta360 X6, or DJI Neo 2. Choose your gear, send your dates, and plan your next adventure.',
  icons: { icon: '/assets/logo.png' },
  alternates: { canonical: siteUrl() },
  robots: { index: indexable(), follow: indexable() },
  openGraph: { type: 'website', url: siteUrl(), siteName: 'HiramShot Camera Rentals', title: 'HiramShot Camera Rentals', description: 'Your next story starts with the right gear. Rent Insta360 cameras and DJI drones in Norzagaray, Bulacan.', locale: 'en_PH', images: [{ url: siteUrl('/assets/logo.png'), alt: 'HiramShot Camera Rentals official logo' }] },
  twitter: { card: 'summary', title: 'HiramShot Camera Rentals', images: [siteUrl('/assets/logo.png')] },
}; }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
