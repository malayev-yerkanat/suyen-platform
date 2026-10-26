'use client';

import { useAnimate } from 'motion/react';
import { useMotionEnabled } from '@/components/useMotionEnabled';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { translate, type Locale } from '@/lib/i18n/catalog';
import { motionConfig } from '@/lib/motion-config';
import { motionTokens, springs } from '@/lib/motion-tokens';

const sections = [
  { href: '/demo', label: 'nav.dashboard' },
  { href: '/demo/profile', label: 'nav.profile' },
  { href: '/demo/specialists', label: 'nav.specialists' },
  { href: '/demo/bookings', label: 'nav.bookings' },
  { href: '/demo/feedback', label: 'nav.feedback' },
] as const;

type NavigationProps = { locale: Locale; localeSwitch: ReactNode; signOut: ReactNode };

export function DemoNavigation(props: NavigationProps) {
  const pathname = usePathname();
  return <NavigationContent key={pathname} {...props} pathname={pathname} />;
}

function NavigationContent({ locale, localeSwitch, signOut, pathname }: NavigationProps & { pathname: string }) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [panelRef, animate] = useAnimate<HTMLElement>();
  const motionEnabled = useMotionEnabled();
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel || !motionEnabled || !motionConfig.shouldAnimate()) return;
    // Start after the disclosure is visible; keep SSR and closed-menu focus behavior native.
    const controls = animate(panel, { opacity: [0, 1], y: [-motionTokens.distance.sm, 0] }, springs.snappy);
    return () => {
      controls.stop();
      panel.style.removeProperty('opacity');
      panel.style.removeProperty('transform');
    };
  }, [animate, open, panelRef, motionEnabled]);
  const currentSection = sections.find(({ href }) => pathname === href || (href !== '/demo' && pathname.startsWith(`${href}/`)));
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  return (
    <div className="demo-navigation" data-open={open}>
      <div className="demo-navigation__toolbar">
        <button ref={toggleRef} type="button" className="demo-navigation__toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          <span className="demo-navigation__current">{translate(locale, currentSection?.label ?? 'nav.demo')}</span>
          <span>{translate(locale, 'nav.menu')}</span>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={open ? 'm6 6 12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
        </button>
        {localeSwitch}
      </div>
      <nav ref={panelRef} id={panelId} className="demo-nav demo-navigation__panel" aria-label={translate(locale, 'nav.demo')}>
        {sections.map(({ href, label }) => (
          <Link key={href} href={href} aria-current={currentSection?.href === href ? (pathname === href ? 'page' : 'location') : undefined} onClick={() => setOpen(false)}>
            {translate(locale, label)}
          </Link>
        ))}
        {signOut}
      </nav>
    </div>
  );
}
