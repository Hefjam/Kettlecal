import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { Platform } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
}

// On web, active icons (acid yellow) get a neon drop-shadow glow.
// The dim purple inactive color produces no visible glow, so this is safe always-on.
function svgStyle(color: string) {
  return Platform.OS === 'web'
    ? ({ filter: `drop-shadow(0 0 4px ${color})` } as any)
    : {};
}

export function TodayIcon({ size = 22, color = '#fdeaf4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={svgStyle(color)}>
      <Path d="M3 10.5L12 3l9 7.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 9v11h5v-5h4v5h5V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function HistoryIcon({ size = 22, color = '#fdeaf4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={svgStyle(color)}>
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.8" />
      <Path d="M12 7v5.5l3.5 3.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ProgressIcon({ size = 22, color = '#fdeaf4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={svgStyle(color)}>
      <Path d="M3 21h18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M5 21V14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M9 21V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M13 21V12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M17 21V5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function CoachIcon({ size = 22, color = '#fdeaf4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={svgStyle(color)}>
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.8" />
      <Circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth="1.8" />
      <Path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function KitIcon({ size = 22, color = '#fdeaf4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={svgStyle(color)}>
      {/* Handle arch */}
      <Path d="M8.5 10C8.5 7.5 10 5.5 12 5.5C14 5.5 15.5 7.5 15.5 10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Collar */}
      <Path d="M8 11h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Bell body */}
      <Circle cx="12" cy="16.5" r="4.5" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}
