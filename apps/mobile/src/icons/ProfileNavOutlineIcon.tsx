import Svg, { Circle, Path, SvgProps } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';

export const ProfileNavOutlineIcon = ({
  color,
  width = 24,
  height = 24,
  ...props
}: SvgProps) => {
  const { color: baseColor } = useResolveClassNames('text-text-white');

  return (
    <Svg
      width={width}
      height={height}
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <Circle
        cx={12}
        cy={7.5}
        r={4.5}
        stroke={color || baseColor}
        strokeWidth={1.8}
      />
      <Path
        stroke={color || baseColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        d="M3 21v-2.25c0-2.992 5.996-4.5 9-4.5s9 1.508 9 4.5V21"
      />
    </Svg>
  );
};
