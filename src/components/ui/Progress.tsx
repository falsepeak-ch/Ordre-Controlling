import './Progress.css';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'thin' | 'default' | 'tall';
  tone?: 'solid' | 'striped' | 'over';
  label?: string;
}

export function Progress({
  value,
  max = 100,
  size = 'default',
  tone = 'solid',
  label,
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={['progress', `progress-${size}`].join(' ')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className={['progress-fill', `progress-fill-${tone}`].join(' ')} style={{ width: `${pct}%` }} />
    </div>
  );
}
