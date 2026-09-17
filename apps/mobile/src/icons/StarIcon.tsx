import { useId } from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
  SvgProps,
} from 'react-native-svg';

interface StarProps extends SvgProps {
  filled: number;
  size: number;
}

export const StarIcon = ({ filled, size = 24 }: StarProps) => {
  const fillId = `star-fill-${useId()}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Defs>
        <LinearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset={`${filled * 100}%`} stopColor="#FFAF34" />
          <Stop offset={`${filled * 100}%`} stopColor="#E0E0E0" />
        </LinearGradient>
      </Defs>
      <Path
        d="M.031 4.535a.643.643 0 0 1 .55-.458l3.463-.328L5.414.404A.638.638 0 0 1 6 0c.255 0 .485.159.586.404l1.37 3.345 3.464.328c.255.025.47.204.549.458a.684.684 0 0 1-.187.707L9.164 7.638l.772 3.548a.68.68 0 0 1-.248.687.619.619 0 0 1-.7.032L6 10.042l-2.987 1.863a.613.613 0 0 1-.7-.032.68.68 0 0 1-.249-.687l.772-3.548L.218 5.242a.685.685 0 0 1-.187-.707Z"
        fill={`url(#${fillId})`}
      />
    </Svg>
  );
};
