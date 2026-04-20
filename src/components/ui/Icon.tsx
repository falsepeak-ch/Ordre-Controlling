import type { SVGProps } from 'react';
import { ICON_COMPONENTS, type IconName } from '~/icons';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number | string;
}

export function Icon({ name, size = 16, ...rest }: IconProps) {
  const Cmp = ICON_COMPONENTS[name];
  if (!Cmp) return null;
  return <Cmp size={size} {...rest} />;
}
