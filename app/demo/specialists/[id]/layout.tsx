import { demoMetadata } from '@/lib/demo-metadata';

export const generateMetadata = () => demoMetadata('specialist');

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
