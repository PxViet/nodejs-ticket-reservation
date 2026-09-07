import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useMemo, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';

// Uniwind
import { useResolveClassNames } from 'uniwind';

// Icons
import { ChevronDownIcon } from '@/icons/ChevronDownIcon';
import { LocationIcon } from '@/icons/LocationIcon';

// Components
import { Typo } from '@/components/Typo';

// Hooks
import { useHalls } from '@/features/booking/hooks/useHalls';

// Utils
import { cn } from '@/utils/cn';

export interface HallOption {
  label: string;
  value: string;
}

export interface HallDropdownProps {
  value?: string;
  testID?: string;
  onChange: (value: string) => void;
  containerClassName?: string;
  disabled?: boolean;
}

/** The empty selection — every hall, i.e. no `hallId` on the request. */
const ALL_HALLS: HallOption = { label: 'All Halls', value: '' };

export const HallDropdown = memo(
  ({
    value = '',
    testID,
    onChange,
    containerClassName,
    disabled = false,
  }: HallDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const iconColorConfig = useResolveClassNames('text-white');

    const { data: halls, isLoading, isError } = useHalls();

    const hallOptions = useMemo(
      () => [
        ALL_HALLS,
        ...(halls ?? []).map(hall => ({
          label: `${hall.name} · ${hall.hallType}`,
          value: hall.id,
        })),
      ],
      [halls],
    );

    const handleOpen = useCallback(() => {
      if (disabled || isLoading) return;

      setIsOpen(true);
      setIsFocused(true);
    }, [disabled, isLoading]);

    const handleClose = useCallback(() => {
      setIsOpen(false);
      setIsFocused(false);
    }, []);

    const handleSelect = useCallback(
      (selectedValue: string) => {
        onChange(selectedValue);
        handleClose();
      },
      [onChange, handleClose],
    );

    const selectedOption = useMemo(
      () => hallOptions.find(option => option.value === value) || null,
      [hallOptions, value],
    );

    const borderColor = useMemo(
      () =>
        isError ? 'border-red' : isFocused ? 'border-primary' : 'border-white',
      [isError, isFocused],
    );

    const displayText = isLoading
      ? 'Loading halls...'
      : selectedOption?.label || ALL_HALLS.label;

    const renderItem = useCallback(
      ({ item }: { item: HallOption }) => {
        const isSelected = value === item.value;

        return (
          <TouchableOpacity
            onPress={() => handleSelect(item.value)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.label}`}
            testID={`${testID}-option-${item.value}`}
            className={cn(
              'px-6 py-4 flex-row items-center justify-between',
              isSelected && 'bg-white/5',
            )}
          >
            <Typo
              size="base"
              weight={isSelected ? 'semibold' : 'regular'}
              className={isSelected ? 'text-primary' : 'text-white'}
            >
              {item.label}
            </Typo>
            {isSelected && <View className="w-2 h-2 rounded-full bg-green" />}
          </TouchableOpacity>
        );
      },
      [handleSelect, testID, value],
    );

    return (
      <View className={cn('w-full', containerClassName)} testID={testID}>
        <View className="relative">
          {/* Dropdown Button */}
          <TouchableOpacity
            onPress={handleOpen}
            disabled={disabled || isLoading}
            activeOpacity={1}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Hall selector${selectedOption ? `, currently selected: ${selectedOption.label}` : ', no hall selected'}`}
            accessibilityHint="Tap to open hall selection menu"
            accessibilityState={{ disabled: disabled || isLoading }}
            testID={`${testID}-button`}
            className={cn(
              'w-full h-12 px-4 flex-row items-center justify-between border rounded-base',
              borderColor,
              (disabled || isLoading) && 'opacity-50',
            )}
          >
            <View className="flex-row items-center flex-1 gap-3">
              <LocationIcon color={iconColorConfig.color} />
              <Typo size="sm" weight="regular">
                {displayText}
              </Typo>
            </View>
            <ChevronDownIcon color={iconColorConfig.color} />
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {isError && (
          <Typo
            accessibilityRole="alert"
            accessibilityLabel="Could not load halls"
            size="xs"
            weight="regular"
            className="text-red mt-1 ml-4"
            testID={`${testID}-error`}
          >
            Could not load halls
          </Typo>
        )}

        {/* Options Modal */}
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={handleClose}
          testID={`${testID}-modal`}
        >
          <TouchableOpacity
            className="flex-1 bg-black/50 justify-end"
            activeOpacity={1}
            onPress={handleClose}
            testID={`${testID}-modal-backdrop`}
          >
            <View className="bg-dark-blue rounded-t-3xl">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/10">
                <Typo size="lg" weight="semibold" className="text-white">
                  Hall
                </Typo>
                <TouchableOpacity
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close dropdown"
                  testID={`${testID}-modal-close`}
                >
                  <Typo size="base" weight="medium" className="text-primary">
                    Done
                  </Typo>
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <View className="h-40">
                <FlashList
                  data={hallOptions}
                  keyExtractor={item => item.value}
                  renderItem={renderItem}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  },
);

HallDropdown.displayName = 'HallDropdown';
