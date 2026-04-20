import type { SVGProps } from 'react';

export interface IconComponentProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function ArrowLeft({ size = 16, ...props }: IconComponentProps) {
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
      <path fillRule="evenodd" clipRule="evenodd" d="M20 13C20.5523 13 21 12.5523 21 12C21 11.4477 20.5523 11 20 11L6.41397 11L5.41406 11.9999L6.41416 13H20Z" fill="currentColor" fillOpacity="0.4"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M11.4141 5.99991L5.41406 11.9999L11.4141 17.9999L9.99985 19.4141L3.29274 12.707C2.90222 12.3165 2.90222 11.6833 3.29274 11.2928L9.99985 4.58569L11.4141 5.99991Z" fill="currentColor"/>
    </svg>
  );
}
