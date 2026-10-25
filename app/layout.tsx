import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'HiramShot Camera Rentals — Borrow the gear. Own the moment.',
  description: 'Rent an Insta360 X5, Insta360 X6, or DJI Neo 2. Choose your gear, send your dates, and plan your next adventure.',
  icons: { icon: '/assets/logo.png' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
