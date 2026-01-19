import React from 'react';
import { Feather } from '@expo/vector-icons';

const iconFamilies = {
  feather: Feather,
};

export function Icon({
  name,
  family = 'feather',
  icon: IconComponent,
  renderIcon,
  size = 20,
  color,
  ...rest
}) {
  if (typeof renderIcon === 'function') {
    return renderIcon({ size, color, ...rest });
  }

  if (React.isValidElement(IconComponent)) {
    return IconComponent;
  }

  if (IconComponent) {
    return <IconComponent size={size} color={color} {...rest} />;
  }

  if (typeof name === 'string' && name.trim().length > 0) {
    const Family = iconFamilies[family] || Feather;
    return <Family name={name} size={size} color={color} {...rest} />;
  }

  return null;
}
