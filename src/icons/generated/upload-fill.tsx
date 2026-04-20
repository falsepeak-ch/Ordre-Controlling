import type { SVGProps } from 'react';

export interface IconComponentProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function UploadFill({ size = 16, ...props }: IconComponentProps) {
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
      <path d="M4 14C3.448 14 3 14.448 3 15V17C3 19.209 4.791 21 7 21H17C19.209 21 21 19.209 21 17V15C21 14.448 20.552 14 20 14C19.448 14 19 14.448 19 15V17C19 18.105 18.105 19 17 19H7C5.895 19 5 18.105 5 17V15C5 14.448 4.552 14 4 14Z" fill="currentColor" fillOpacity="0.4"/>
      <path d="M12 2L6 8H11V16C11 16.552 11.448 17 12 17C12.552 17 13 16.552 13 16V8H18L12 2Z" fill="currentColor"/>
    </svg>
  );
}
