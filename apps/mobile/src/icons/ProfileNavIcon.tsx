import Svg, { Path, SvgProps } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';

// A small, single-tone person glyph for the bottom tab bar — distinct from
// `UserProfileIcon`, which is a large decorative avatar illustration and is
// the wrong shape for a 24x24 tab icon.
export const ProfileNavIcon = ({
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
      <Path
        fill={color || baseColor}
        d="M12 12c2.485 0 4.5-2.015 4.5-4.5S14.485 3 12 3 7.5 5.015 7.5 7.5 9.515 12 12 12Zm0 2.25c-3.004 0-9 1.508-9 4.5V21h18v-2.25c0-2.992-5.996-4.5-9-4.5Z"
      />
    </Svg>
  );
};
