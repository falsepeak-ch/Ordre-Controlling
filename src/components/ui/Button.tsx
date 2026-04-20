import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes, type ReactNode } from 'react';
import './Button.css';

type Variant = 'primary' | 'ghost' | 'subtle' | 'icon' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
}

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;
export type ButtonAnchorProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' };

function classesFor(variant: Variant, size: Size, fullWidth?: boolean) {
  return [
    'btn',
    `btn-${variant}`,
    `btn-size-${size}`,
    fullWidth ? 'btn-block' : null,
  ]
    .filter(Boolean)
    .join(' ');
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading, leading, trailing, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[classesFor(variant, size, fullWidth), className].filter(Boolean).join(' ')}
      disabled={disabled || isLoading}
      {...rest}
    >
      {leading ? <span className="btn-adornment">{leading}</span> : null}
      <span className="btn-label">{children}</span>
      {trailing ? <span className="btn-adornment">{trailing}</span> : null}
    </button>
  );
});

export function ButtonAnchor({
  variant = 'primary',
  size = 'md',
  leading,
  trailing,
  fullWidth,
  className,
  children,
  ...rest
}: Omit<ButtonAnchorProps, 'as'>) {
  return (
    <a
      className={[classesFor(variant, size, fullWidth), className].filter(Boolean).join(' ')}
      {...rest}
    >
      {leading ? <span className="btn-adornment">{leading}</span> : null}
      <span className="btn-label">{children}</span>
      {trailing ? <span className="btn-adornment">{trailing}</span> : null}
    </a>
  );
}
