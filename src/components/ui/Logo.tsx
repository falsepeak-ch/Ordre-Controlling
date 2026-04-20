import './Logo.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

export function Logo({ size = 'md', showWordmark = true }: LogoProps) {
  return (
    <span className={['logo', `logo-${size}`].join(' ')} aria-label="Ordre">
      <span className="logo-mark">O</span>
      {showWordmark ? <span className="logo-word">Ordre</span> : null}
    </span>
  );
}
