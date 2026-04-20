import type { SVGProps } from 'react';

export interface IconComponentProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function ArrowRight({ size = 16, ...props }: IconComponentProps) {
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
      <path fillRule="evenodd" clipRule="evenodd" d="M3 12C3 12.5523 3.44772 13 4 13H20C20.5523 13 21 12.5523 21 12C21 11.4477 20.5523 11 20 11L4 11C3.44772 11 3 11.4477 3 12Z" fill="currentColor" fillOpacity="0.4"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M12.5859 5.99991L18.5859 11.9999L12.5859 17.9999L14.0002 19.4141L20.7073 12.707C21.0978 12.3165 21.0978 11.6833 20.7073 11.2928L14.0002 4.58569L12.5859 5.99991Z" fill="currentColor"/>
    </svg>
  );
}
