import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const motionState = vi.hoisted(() => ({ reduced: false, allowed: true, stop: vi.fn(), animate: vi.fn() }));
vi.mock('motion/react', async () => {
  const { useRef } = await import('react');
  return { useAnimate: () => [useRef(null), motionState.animate] };
});
vi.mock('@/components/useMotionEnabled', () => ({ useMotionEnabled: () => !motionState.reduced }));
vi.mock('@/lib/motion-config', () => ({ motionConfig: { shouldAnimate: () => motionState.allowed } }));
const route = vi.hoisted(() => ({ pathname: '/demo' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));
import { DemoNavigation } from '@/components/DemoNavigation';

function navigation(locale: 'ru' | 'kk' = 'ru') {
  return <DemoNavigation locale={locale} localeSwitch={<button>RU</button>} signOut={<button>Sign out</button>} />;
}
afterEach(() => { cleanup(); route.pathname = '/demo'; motionState.reduced = false; motionState.allowed = true; vi.clearAllMocks(); });
describe('demo navigation', () => {
  it('keeps language controls before section links in native keyboard order', () => {
    render(navigation());
    const language = screen.getByRole('button', { name: 'RU' });
    const firstLink = screen.getByRole('link', { name: 'Обзор' });
    expect(language.compareDocumentPosition(firstLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(language.tabIndex).toBe(0);
    expect(firstLink.tabIndex).toBe(0);
  });
  it('animates only on opening and cancels motion when closing', () => {
    motionState.animate.mockReturnValue({ stop: motionState.stop });
    render(navigation());
    expect(motionState.animate).not.toHaveBeenCalled();
    const toggle = screen.getByRole('button', { name: /Меню/ });
    fireEvent.click(toggle);
    const panel = screen.getByRole('navigation');
    expect(motionState.animate).toHaveBeenCalledWith(panel, expect.objectContaining({ opacity: [0, 1], y: expect.any(Array) }), expect.any(Object));
    panel.style.transform = 'translateY(-4px)';
    panel.style.opacity = '0.5';
    fireEvent.click(toggle);
    expect(motionState.stop).toHaveBeenCalledOnce();
    expect(panel.style.transform).toBe('');
    expect(panel.style.opacity).toBe('');
  });
  it.each(['reduced', 'low-end'])('keeps the menu functional without animation for %s', (mode) => {
    motionState.reduced = mode === 'reduced';
    motionState.allowed = mode !== 'low-end';
    render(navigation());
    const toggle = screen.getByRole('button', { name: /Меню/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(motionState.animate).not.toHaveBeenCalled();
  });
  it('stops motion when the preference changes while the menu is open', () => {
    motionState.animate.mockReturnValue({ stop: motionState.stop });
    const { rerender } = render(navigation());
    fireEvent.click(screen.getByRole('button', { name: /Меню/ }));
    motionState.reduced = true;
    rerender(navigation());
    expect(motionState.stop).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /Меню/ })).toHaveAttribute('aria-expanded', 'true');
    expect(motionState.animate).toHaveBeenCalledOnce();
  });
  it('stops an in-flight animation on unmount', () => {
    motionState.animate.mockReturnValue({ stop: motionState.stop });
    const { unmount } = render(navigation());
    fireEvent.click(screen.getByRole('button', { name: /Меню/ }));
    unmount();
    expect(motionState.stop).toHaveBeenCalledOnce();
  });
  it('marks dashboard exactly and keeps language switch outside the collapsed panel', () => {
    render(navigation());
    expect(screen.getByRole('link', { name: 'Обзор' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Специалисты' })).not.toHaveAttribute('aria-current');
    const toggle = screen.getByRole('button', { name: /Обзор.*Меню/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toHaveAttribute('aria-label', 'Тестовая платформа');
    expect(screen.getByRole('button', { name: 'RU' }).closest('nav')).toBeNull();
  });
  it.each(['/demo/specialists/example', '/demo/bookings/example', '/demo/profile'])('shows the current section on %s', (path) => {
    route.pathname = path;
    const label = path.includes('specialists') ? 'Специалисты' : path.includes('bookings') ? 'Записи' : 'Профиль ребёнка';
    render(navigation());
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', path.endsWith('example') ? 'location' : 'page');
    expect(screen.getByRole('link', { name: 'Обзор' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
  });
  it('closes on Escape and returns focus to its toggle', () => {
    render(navigation());
    const toggle = screen.getByRole('button', { name: /Меню/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const link = screen.getByRole('link', { name: 'Специалисты' });
    link.focus();
    fireEvent.keyDown(link, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
  it('closes on a route link click', () => {
    render(navigation());
    const toggle = screen.getByRole('button', { name: /Меню/ });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('link', { name: 'Записи' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
  it('closes when the pathname changes and labels feedback in Kazakh', () => {
    const { rerender } = render(navigation('kk'));
    fireEvent.click(screen.getByRole('button', { name: /Мәзір/ }));
    route.pathname = '/demo/feedback';
    rerender(navigation('kk'));
    expect(screen.getByRole('button', { name: /Кері байланыс.*Мәзір/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'Кері байланыс' })).toHaveAttribute('aria-current', 'page');
  });
});
