import type { SVGProps } from 'react';

export interface IconComponentProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function Plus({ size = 16, ...props }: IconComponentProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M12 3C11.448 3 11 3.448 11 4V11H4C3.448 11 3 11.448 3 12C3 12.552 3.448 13 4 13H11V20C11 20.552 11.448 21 12 21C12.552 21 13 20.552 13 20V13H20C20.552 13 21 12.552 21 12C21 11.448 20.552 11 20 11H13V4C13 3.448 12.552 3 12 3Z" fill="currentColor"/>
    </svg>
  );
}
