import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

type AppLogoProps = {
  size?: number;
};

export function AppLogo({ size = 88 }: AppLogoProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      accessibilityRole="image"
      accessibilityLabel="WhereIP logo"
    >
      <Defs>
        <LinearGradient id="logoBackground" x1="12" y1="8" x2="112" y2="120">
          <Stop offset="0" stopColor="#49A8FF" />
          <Stop offset="0.56" stopColor="#0B84F3" />
          <Stop offset="1" stopColor="#0A67C7" />
        </LinearGradient>
      </Defs>
      <Path
        d="M28 8h72c11 0 20 9 20 20v72c0 11-9 20-20 20H28c-11 0-20-9-20-20V28C8 17 17 8 28 8Z"
        fill="url(#logoBackground)"
      />
      <Path
        d="M64 25c-20 0-36 15.5-36 34.7 0 25.6 30.2 50.2 33.6 52.9a3.9 3.9 0 0 0 4.8 0C69.8 109.9 100 85.3 100 59.7 100 40.5 84 25 64 25Z"
        fill="#FFFFFF"
      />
      <Circle cx="64" cy="59" r="20" fill="#E8F5FF" />
      <Circle cx="64" cy="59" r="20" fill="none" stroke="#0B84F3" strokeWidth="4" />
      <Path
        d="M44.8 59h38.4M64 39c-6.2 5.5-9.2 12.1-9.2 20s3 14.5 9.2 20m0-40c6.2 5.5 9.2 12.1 9.2 20s-3 14.5-9.2 20"
        fill="none"
        stroke="#0B84F3"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <Circle cx="92" cy="31" r="7" fill="#52D5BC" />
    </Svg>
  );
}

