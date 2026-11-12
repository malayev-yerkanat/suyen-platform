const paths = {
  'arrow-up-right': 'M7 7h10v10M7 17 17 7',
  check: 'M20 6 9 17l-5-5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M18 6 6 18M6 6l12 12',
} as const;

export type IconName = keyof typeof paths;

/** One line-icon set: 1.5 stroke, drawn at 16 or 18px, colored by the surrounding text. */
export function Icon({ name, size = 16 }: { name: IconName; size?: 16 | 18 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
