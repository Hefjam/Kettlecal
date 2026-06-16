import React from 'react';
import { Colors } from '../../theme/colors';
import { AppIcon } from './AppIcons';

interface StepperIconProps {
  size?: number;
  color?: string;
}

export function PlusIcon({ size = 22, color = Colors.text.primary }: StepperIconProps) {
  const muted = color === Colors.text.muted;
  return <AppIcon name="action.add" size={size} active={!muted} muted={muted} />;
}

export function MinusIcon({ size = 22, color = Colors.text.primary }: StepperIconProps) {
  const muted = color === Colors.text.muted;
  return <AppIcon name="action.remove" size={size} active={!muted} muted={muted} />;
}
