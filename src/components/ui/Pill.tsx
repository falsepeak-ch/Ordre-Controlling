import type { HTMLAttributes, ReactNode } from 'react';
import type { DisplayPOStatus } from '~/types';
import './Pill.css';

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'soft';
  status?: DisplayPOStatus;
  dot?: boolean;
  children: ReactNode;
}

export function Pill({ tone = 'default', status, dot = true, className, children, ...rest }: PillProps) {
  const cls = ['pill', `pill-tone-${tone}`, status ? `pill-status-${status}` : null, className]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={cls} {...rest}>
      {dot ? <span className="pill-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
