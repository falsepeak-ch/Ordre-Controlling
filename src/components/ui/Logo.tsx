import './Logo.css';

type Variant = 'wordmark' | 'stacked' | 'mark';
type Size = 'sm' | 'md' | 'lg';

interface LogoProps {
  variant?: Variant;
  size?: Size;
  className?: string;
}

const PATHS: Record<Variant, { light: string; dark: string }> = {
  wordmark: {
    light: '/logo/landscape/no-name-white.svg',
    dark: '/logo/landscape/no-name-dark.svg',
  },
  stacked: {
    light: '/logo/square/name-white.svg',
    dark: '/logo/square/name-dark.svg',
  },
  mark: {
    light: '/logo/square/no-name-white.svg',
    dark: '/logo/square/no-name-dark.svg',
  },
};

export function Logo({ variant = 'wordmark', size = 'md', className }: LogoProps) {
  const src = PATHS[variant];
  const classes = ['logo', `logo-${variant}`, `logo-${size}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} aria-label="Ordre" role="img">
      <img src={src.light} alt="" className="logo-img logo-img-light" draggable={false} />
      <img src={src.dark} alt="" className="logo-img logo-img-dark" draggable={false} />
    </span>
  );
}
