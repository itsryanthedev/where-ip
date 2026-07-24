import Svg, { Circle, Line, Path } from 'react-native-svg';

type IconProps = {
  color: string;
  size?: number;
};

export function InfoIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2" />
      <Line x1="12" y1="10.5" x2="12" y2="17" stroke={color} strokeWidth="2" />
      <Circle cx="12" cy="7.5" r="1.25" fill={color} />
    </Svg>
  );
}

export function CopyIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path
        d="M8 8h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  );
}

export function RefreshIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path
        d="M20 7v5h-5M4 17v-5h5M18.3 9A7 7 0 0 0 6.5 6.5L4 9m16 6-2.5 2.5A7 7 0 0 1 5.7 15"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

export function ExternalIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path
        d="M14 4h6v6m0-6-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

export function ChevronDownIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path
        d="m7 9.5 5 5 5-5"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

export function CheckIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path
        d="m5 12.5 4.25 4.25L19 7"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.25"
      />
    </Svg>
  );
}
