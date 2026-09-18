import { memo } from 'react';
import { View } from 'react-native';

// Components
import { Typo } from '../Typo';

interface DetailRowProps {
  label: string;
  value: string;
  valueClassName?: string;
  testID?: string;
}

export const DetailRow = memo(
  ({ label, value, valueClassName = '', testID }: DetailRowProps) => (
    <View
      className="flex-row justify-between items-center gap-4"
      testID={testID}
    >
      <Typo size="base" weight="regular" className="shrink text-gradient-light">
        {label}
      </Typo>
      <View className="max-w-1/2">
        <Typo
          size="base"
          weight="regular"
          className={`text-white text-right ${valueClassName}`}
        >
          {value}
        </Typo>
      </View>
    </View>
  ),
);

DetailRow.displayName = 'DetailRow';
