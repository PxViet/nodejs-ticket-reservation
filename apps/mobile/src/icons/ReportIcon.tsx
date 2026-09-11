import Svg, { Rect, SvgProps } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';

export const ReportIcon = ({
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
      <Rect
        x={3}
        y={12}
        width={4.5}
        height={8}
        rx={1}
        fill={color || baseColor}
      />
      <Rect
        x={9.75}
        y={7}
        width={4.5}
        height={13}
        rx={1}
        fill={color || baseColor}
      />
      <Rect
        x={16.5}
        y={3}
        width={4.5}
        height={17}
        rx={1}
        fill={color || baseColor}
      />
    </Svg>
  );
};
