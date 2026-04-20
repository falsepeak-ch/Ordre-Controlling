import type { ReactNode } from 'react';
import { LocaleToggle } from '~/components/ui/LocaleToggle';
import { ThemeToggle } from '~/components/ui/ThemeToggle';
import './Topbar.css';

interface TopbarProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {title ? <h1 className="topbar-title">{title}</h1> : null}
        {subtitle ? <span className="topbar-subtitle">{subtitle}</span> : null}
      </div>
      <div className="topbar-right">
        {actions}
        <LocaleToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
