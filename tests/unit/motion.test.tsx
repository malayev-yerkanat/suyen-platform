import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef, type ComponentPropsWithoutRef } from 'react';
const state = vi.hoisted(() => ({ reduced: false, stop: vi.fn(), animate: vi.fn(), buttonProps: {} as Record<string, unknown> }));
vi.mock('motion/react', () => ({
  motion: { button: (props: ComponentPropsWithoutRef<'button'> & { whileHover?: unknown; whileTap?: unknown; animate?: unknown; transition?: unknown }) => {
    state.buttonProps = props;
    const { whileHover, whileTap, animate, transition, ...native } = props;
    void whileHover; void whileTap; void animate; void transition;
    return <button {...native} />;
  } },
  useAnimate: () => [useRef(null), state.animate],
}));
import { motionConfig } from '@/lib/motion-config';
import { motionTokens } from '@/lib/motion-tokens';
import { MotionScene } from '@/components/MotionScene';
import { StatusMark } from '@/components/StatusMark';
import { MotionButton } from '@/components/MotionButton';
let mediaQuery: EventTarget & { readonly matches: boolean };
beforeEach(() => {
  state.reduced = false;
  state.animate.mockReturnValue({ stop: state.stop });
  mediaQuery = Object.assign(new EventTarget(), { get matches() { return state.reduced; } });
  Object.defineProperty(mediaQuery, 'matches', { get: () => state.reduced });
  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('motion runtime gate', () => {
  it('allows motion on capable devices', () => expect(motionConfig.shouldAnimate()).toBe(true));
  it('never overrides reduced motion even for essential animation', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    expect(motionConfig.shouldAnimate({ essential: true })).toBe(false);
  });
  it('skips optional motion on low-end devices and permits essential feedback', () => {
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(2);
    expect(motionConfig.shouldAnimate()).toBe(false);
    expect(motionConfig.shouldAnimate({ essential: true })).toBe(true);
  });
  it('tolerates unavailable media queries', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(motionConfig.shouldAnimate()).toBe(true);
  });
  it('returns false on the server', () => {
    vi.stubGlobal('window', undefined);
    expect(motionConfig.shouldAnimate()).toBe(false);
  });
});
describe('progressive motion scene', () => {
  it('renders usable SSR content without hidden styles or client-only placeholders', () => {
    const html = renderToString(<MotionScene><a data-motion="item" href="/demo">Book</a></MotionScene>);
    expect(html).toContain('Book');
    expect(html).not.toMatch(/opacity:0|visibility:hidden|transform:/);
    expect(state.animate).not.toHaveBeenCalled();
  });
  it('caps stagger for long lists and skips nested marked items', () => {
    render(<MotionScene>{Array.from({ length: 9 }, (_, i) => <article key={i} data-motion="item"><span data-motion="item">Item {i}</span></article>)}</MotionScene>);
    expect(state.animate).toHaveBeenCalledTimes(9);
    expect(state.animate.mock.calls[8][2].delay).toBe(motionTokens.maxIndex * motionTokens.stagger);
  });
  it('restores original styles and stops animations on unmount', () => {
    const { unmount } = render(<MotionScene><p data-motion="item" style={{ color: 'red' }}>Item</p></MotionScene>);
    const item = screen.getByText('Item');
    item.style.opacity = '0.5';
    unmount();
    expect(state.stop).toHaveBeenCalled();
    expect(item.style.opacity).toBe('');
    expect(item.style.color).toBe('red');
  });
  it('does not animate under reduced motion', () => {
    state.reduced = true;
    render(<MotionScene><p data-motion="item">Item</p></MotionScene>);
    expect(screen.getByText('Item')).toBeVisible();
    expect(state.animate).not.toHaveBeenCalled();
  });
  it('does not animate on low-end devices', () => {
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(4);
    render(<MotionScene><p data-motion="item">Item</p></MotionScene>);
    expect(state.animate).not.toHaveBeenCalled();
  });
  it('restores complete visible state when reduced motion is enabled mid-animation', () => {
    render(<MotionScene><p data-motion="item">Item</p></MotionScene>);
    screen.getByText('Item').style.opacity = '0.7';
    act(() => { state.reduced = true; mediaQuery.dispatchEvent(new Event('change')); });
    expect(screen.getByText('Item').style.opacity).toBe('');
    expect(state.stop).toHaveBeenCalled();
  });
});
describe('status cue', () => {
  it('renders a complete decorative check before hydration', () => {
    const html = renderToString(<StatusMark />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('M14 24l7 7 13-14');
    expect(html).not.toContain('stroke-dashoffset');
  });
  it('draws once and cancels on unmount', () => {
    const { unmount } = render(<StatusMark />);
    expect(state.animate).toHaveBeenCalledTimes(1);
    const path = state.animate.mock.calls[0][0] as SVGPathElement;
    path.setAttribute('stroke-dashoffset', '0.5');
    unmount();
    expect(state.stop).toHaveBeenCalled();
    expect(path).not.toHaveAttribute('stroke-dashoffset');
  });
  it('shows cancelled state without motion when reduced motion is requested', () => {
    state.reduced = true;
    const { container } = render(<StatusMark variant="cancelled" />);
    expect(container.querySelector('path')).toHaveAttribute('d', 'M16 24h16');
    expect(state.animate).not.toHaveBeenCalled();
  });
});

describe('motion button', () => {
  it('preserves native semantics and enables tokenized gestures', () => {
    render(<MotionButton type="submit" name="save" className="primary">Save</MotionButton>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('button')).toHaveClass('primary', 'motion-button');
    expect(state.buttonProps.whileTap).toEqual({ scale: motionTokens.scale.press });
  });
  it('disables gestures while pending', () => {
    render(<MotionButton disabled>Saving</MotionButton>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(state.buttonProps.whileHover).toBeUndefined();
    expect(state.buttonProps.whileTap).toBeUndefined();
  });
  it('resets transforms when reduced motion is turned on', () => {
    render(<MotionButton>Save</MotionButton>);
    act(() => { state.reduced = true; mediaQuery.dispatchEvent(new Event('change')); });
    expect(state.buttonProps.animate).toEqual({ y: 0, scale: 1 });
    expect(state.buttonProps.whileTap).toBeUndefined();
  });
});

it('unsubscribes from live media-query changes on unmount', () => {
  const add = vi.spyOn(mediaQuery, 'addEventListener');
  const remove = vi.spyOn(mediaQuery, 'removeEventListener');
  const { unmount } = render(<StatusMark />);
  expect(add).toHaveBeenCalledWith('change', expect.any(Function));
  act(() => { state.reduced = true; mediaQuery.dispatchEvent(new Event('change')); });
  expect(state.stop).toHaveBeenCalled();
  unmount();
  expect(remove).toHaveBeenCalledWith('change', add.mock.calls[0][1]);
});
