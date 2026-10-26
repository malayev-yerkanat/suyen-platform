import { demoMetadata } from '@/lib/demo-metadata';

export const generateMetadata = () => demoMetadata('bookings');

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
