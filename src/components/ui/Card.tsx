import type { HTMLAttributes } from 'react';
import './Card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'muted';
}

export function Card({ size = 'md', tone = 'default', className, ...rest }: CardProps) {
  const cls = ['card', `card-${size}`, tone === 'muted' ? 'card-muted' : null, className]
    .filter(Boolean)
    .join(' ');
  return <div className={cls} {...rest} />;
}
