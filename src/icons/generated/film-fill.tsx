import type { SVGProps } from 'react';

export interface IconComponentProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function FilmFill({ size = 16, ...props }: IconComponentProps) {
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
      <path fillRule="evenodd" clipRule="evenodd" d="M15 3H9V11H15V3ZM15 13H9V21H15V13Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M6 3H9V21H6C4.34315 21 3 19.6569 3 18V6C3 4.34315 4.34315 3 6 3ZM7 11V9H5V11H7ZM5 17V18C5 18.5523 5.44772 19 6 19H7V17H5ZM5 15H7V13H5V15ZM7 5H6C5.44772 5 5 5.44772 5 6V7H7V5ZM18 3H15V21H18C19.6569 21 21 19.6569 21 18V6C21 4.34315 19.6569 3 18 3ZM17 15V13H19V15H17ZM18 19H17V17H19V18C19 18.5523 18.5523 19 18 19ZM19 9V11H17V9H19ZM19 6V7H17V5H18C18.5523 5 19 5.44772 19 6Z" fill="currentColor" fillOpacity="0.4"/>
    </svg>
  );
}
