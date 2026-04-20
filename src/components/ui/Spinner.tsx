import './Spinner.css';

interface SpinnerProps {
  size?: number;
  label?: string;
}

export function Spinner({ size = 18, label }: SpinnerProps) {
  return (
    <span className="spinner" role="status" aria-label={label ?? 'Loading'}>
      <span className="spinner-ring" style={{ width: size, height: size }} />
    </span>
  );
}
