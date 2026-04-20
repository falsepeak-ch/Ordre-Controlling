import type { SVGProps } from 'react';

export interface IconComponentProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function ClockFill({ size = 16, ...props }: IconComponentProps) {
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
      <path d="M12.0142 1.9989C6.49136 1.9989 2.01416 6.4759 2.01416 11.9989C2.01416 17.5219 6.49126 21.9989 12.0142 21.9989C17.537 21.9989 22.0142 17.5219 22.0142 11.9989C22.0142 6.4759 17.537 1.9989 12.0142 1.9989Z" fill="currentColor" fillOpacity="0.4"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 6C12.5523 6 13 6.44772 13 7V11.5858L15.7071 14.2929C16.0976 14.6834 16.0976 15.3166 15.7071 15.7071C15.3166 16.0976 14.6834 16.0976 14.2929 15.7071L11.2929 12.7071C11.1054 12.5196 11 12.2652 11 12V7C11 6.44772 11.4477 6 12 6Z" fill="currentColor"/>
    </svg>
  );
}
