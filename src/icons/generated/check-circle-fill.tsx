import type { SVGProps } from 'react';

export interface IconComponentProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function CheckCircleFill({ size = 16, ...props }: IconComponentProps) {
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
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.4"/>
      <path d="M15.9909 9C15.7359 9 15.4689 9.08601 15.2739 9.281L11.5639 13.031C11.3069 13.289 11.0489 13.241 10.8469 12.938L9.84995 11.438C9.54395 10.978 8.90494 10.85 8.44694 11.156C7.98894 11.463 7.86094 12.103 8.16594 12.562L9.16395 14.062C10.0639 15.416 11.82 15.588 12.967 14.438L16.7079 10.719C17.0969 10.328 17.0969 9.672 16.7079 9.281C16.5129 9.08601 16.2459 9 15.9909 9Z" fill="currentColor"/>
    </svg>
  );
}
