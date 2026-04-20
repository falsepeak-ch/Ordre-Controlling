import type { SVGProps } from 'react';

export interface IconComponentProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function BoxArrowRightFill({ size = 16, ...props }: IconComponentProps) {
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
      <path d="M7 21C4.79086 21 3 19.2091 3 17L3 7C3 4.79086 4.79086 3 7 3H10C12.2091 3 14 4.79086 14 7V17C14 19.2091 12.2091 21 10 21H7Z" fill="currentColor" fillOpacity="0.4"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M9 11C8.44772 11 8 11.4477 8 12C8 12.5523 8.44772 13 9 13H17V17L22 12.0001L17 7V11H9Z" fill="currentColor"/>
    </svg>
  );
}
