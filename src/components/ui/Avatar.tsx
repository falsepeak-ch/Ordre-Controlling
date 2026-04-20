import './Avatar.css';

interface AvatarProps {
  name?: string;
  initials?: string;
  photoURL?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

function computeInitials(name?: string, initials?: string): string {
  if (initials) return initials.slice(0, 2).toUpperCase();
  if (!name) return '··';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ name, initials, photoURL, size = 'md' }: AvatarProps) {
  const cls = ['avatar', `avatar-${size}`].join(' ');
  if (photoURL) {
    return <img className={cls} src={photoURL} alt={name ?? ''} referrerPolicy="no-referrer" />;
  }
  return (
    <span className={cls} aria-label={name ?? 'avatar'}>
      {computeInitials(name, initials)}
    </span>
  );
}
