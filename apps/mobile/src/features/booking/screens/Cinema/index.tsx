import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

// Expo
import { Href, router, useLocalSearchParams } from 'expo-router';

// Unwind
import { useResolveClassNames, withUniwind } from 'uniwind';

// Components
import { Typo } from '@/components/Typo';
import { HallDropdown } from '@/features/booking/components/HallDropdown';
import { SelectBox } from '@/features/booking/components/SelectBox';

// Constants
import { ERROR_MESSAGES, ROUTES } from '@/constants';

// Hooks
import { useShowtimes } from '@/features/booking/hooks/useShowtimes';

// Icons
import { ArrowRightIcon } from '@/icons/ArrowRightIcon';

// Utils
import { formatShowTimes, getDayOfWeekLabels } from '@/utils/dates';
import { formatTime } from '@/utils/formats';

// Store
import { useBookingStore } from '@/features/booking/store/booking';
import { useToastStore } from '@/stores/toast';

// Types
import {
  HallWithShowtimes,
  Showtime,
} from '@/features/booking/schemas/showtime';

const StyledSafeAreaView = withUniwind(SafeAreaView);

const CinemaScreen = () => {
  const params = useLocalSearchParams<{
    movieTitle: string;
    movieId?: string;
  }>();
  const movieId = params.movieId || '';

  // '' means every hall — no `hallId` on the request.
  const [selectedHallId, setSelectedHallId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShowtime, setSelectedShowtime] = useState<{
    hallId: string;
    showtimeId: string;
  } | null>(null);

  const showToast = useToastStore(state => state.showError);
  const setShowtime = useBookingStore(state => state.setShowtime);

  const iconColorConfig = useResolveClassNames('text-white');

  const DATE_LABELS = getDayOfWeekLabels();

  // Use selected date or default to today's date
  const showDate = selectedDate || DATE_LABELS[0]?.id || '';

  const {
    data: showtimesData,
    isLoading,
    isError,
    error: showtimesError,
  } = useShowtimes(movieId, showDate, selectedHallId || undefined);

  const hallsWithShowtimes = useMemo(() => {
    if (!showtimesData || showtimesData.length === 0) return [];

    return formatShowTimes(showtimesData, showDate);
  }, [showtimesData, showDate]);

  const isDisabled = useMemo(
    () => selectedShowtime && selectedDate,
    [selectedDate, selectedShowtime],
  );

  useEffect(() => {
    if (isError) {
      showToast(showtimesError?.message || ERROR_MESSAGES.SOMETHING_WENT_WRONG);
    }
  }, [showtimesError, showToast, isError]);

  const handleNavigateToSeatSelection = useCallback(() => {
    if (!selectedShowtime) return;

    router.push(ROUTES.SEATS as Href);
  }, [selectedShowtime]);

  const handleDateSelect = useCallback(
    (dateId: string) => {
      selectedDate && dateId !== selectedDate && setSelectedShowtime(null);
      setSelectedDate(dateId);
    },
    [selectedDate],
  );

  const handleShowtimeSelect = useCallback(
    (hallId: string, showtimeId: string) => {
      const showtime = hallsWithShowtimes
        .find(item => item.hall.id === hallId)
        ?.showtimes.find((showtime: Showtime) => showtime.id === showtimeId);
      setSelectedShowtime({ hallId, showtimeId });

      if (showtime) {
        setShowtime(showtime);
      }
    },
    [hallsWithShowtimes, setShowtime],
  );

  const handleHallChange = useCallback(
    (value: string) => {
      // The selection belongs to a hall that may be about to leave the list.
      value !== selectedHallId && setSelectedShowtime(null);
      setSelectedHallId(value);
    },
    [selectedHallId],
  );

  const keyShowtimeExtractor = useCallback((item: Showtime) => item.id, []);
  const keyExtractor = useCallback(
    (item: HallWithShowtimes) => item.hall.id,
    [],
  );

  const HorizontalItemSeparator = useCallback(
    () => <View className="w-4" />,
    [],
  );

  const ItemSeparator = useCallback(() => <View className="h-6" />, []);

  const ListHeaderComponent = useCallback(
    () => (
      <View className="pl-6">
        {/* Hall Selection */}
        <View className="mb-6 mr-6">
          <HallDropdown
            value={selectedHallId}
            onChange={handleHallChange}
            containerClassName="w-full"
          />
        </View>

        {/* Date Selection */}
        <View className="mb-6">
          <Typo size="xl" weight="medium" className="mb-4">
            Choose Date
          </Typo>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, paddingRight: 24 }}
          >
            {DATE_LABELS.map(({ id, label, dayNumber }) => {
              const isSelected = selectedDate === id;
              const handleSelectDate = () => handleDateSelect(id || '');

              return (
                <View key={id}>
                  <SelectBox
                    value={label || ''}
                    date={dayNumber}
                    isPrimary={isSelected}
                    onPress={handleSelectDate}
                    accessibilityLabel={`Select date ${label}`}
                    accessibilityHint={
                      isSelected
                        ? `${label} is currently selected`
                        : `Select ${label} as the show date`
                    }
                    className="py-5 px-1 min-w-17.5"
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    ),
    [
      selectedHallId,
      selectedDate,
      handleHallChange,
      handleDateSelect,
      DATE_LABELS,
    ],
  );

  const renderShowtime = useCallback(
    ({
      item: showtime,
      hallId,
      hallName,
    }: {
      item: { id: string; showTime: string };
      hallId: string;
      hallName: string;
    }) => {
      const isSelected =
        selectedShowtime?.hallId === hallId &&
        selectedShowtime?.showtimeId === showtime.id;

      const formattedTime = formatTime(showtime.showTime);

      return (
        <SelectBox
          value={formattedTime}
          isPrimary={isSelected}
          accessibilityLabel={`Showtime ${formattedTime} in ${hallName}`}
          accessibilityHint={
            isSelected
              ? `${formattedTime} is currently selected. Tap to deselect`
              : `Select showtime ${formattedTime} in ${hallName}`
          }
          className="py-3 px-4.5"
          onPress={() => handleShowtimeSelect(hallId, showtime.id)}
        />
      );
    },
    [selectedShowtime, handleShowtimeSelect],
  );

  const renderHall = useCallback(
    ({ item }: { item: HallWithShowtimes }) => {
      const { hall, showtimes } = item;

      return (
        <View className="gap-6 pl-6">
          <View className="flex-row items-center gap-2">
            <Typo size="xl" weight="medium">
              {hall.name}
            </Typo>
            <Typo size="sm" weight="regular" className="text-text-secondary">
              {hall.hallType}
            </Typo>
          </View>
          <FlashList
            data={showtimes}
            renderItem={({ item: showtime }) =>
              renderShowtime({
                item: showtime,
                hallId: hall.id,
                hallName: hall.name,
              })
            }
            horizontal
            keyExtractor={keyShowtimeExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 24 }}
            ItemSeparatorComponent={HorizontalItemSeparator}
          />
        </View>
      );
    },
    [renderShowtime, keyShowtimeExtractor, HorizontalItemSeparator],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View
          className="flex-1 items-center justify-center py-16"
          accessibilityRole="progressbar"
        >
          <ActivityIndicator
            size="large"
            testID="showtimes-loading-indicator"
          />
          <Typo
            size="sm"
            className="text-text-secondary mt-4"
            testID="showtimes-loading-text"
          >
            Loading showtimes...
          </Typo>
        </View>
      );
    }

    if (hallsWithShowtimes.length === 0) {
      return (
        <View
          className="flex-1 items-center justify-center py-16 px-6"
          accessibilityRole="text"
        >
          <Typo
            size="xl"
            weight="semibold"
            className="text-text-secondary text-center mb-2"
          >
            No showtimes available
          </Typo>
          <Typo size="sm" className="text-text-secondary text-center">
            Please select a different date
          </Typo>
        </View>
      );
    }
  }, [isLoading, hallsWithShowtimes.length]);

  return (
    <StyledSafeAreaView
      edges={['bottom']}
      accessibilityLabel="Cinema screen"
      accessibilityHint="Cinema screen"
      className="flex-1 bg-dark-blue"
    >
      <View className="flex-1 bg-dark-blue">
        <FlashList
          data={hallsWithShowtimes}
          renderItem={renderHall}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeaderComponent}
          ItemSeparatorComponent={ItemSeparator}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
        />

        {/* Circular Navigation Button */}
        {!isLoading && !isError && hallsWithShowtimes.length > 0 && (
          <View className="absolute bottom-2 left-0 right-0 items-center">
            <TouchableOpacity
              onPress={handleNavigateToSeatSelection}
              disabled={!isDisabled}
              accessibilityRole="button"
              accessibilityLabel="Continue to seat selection"
              className={`w-14 h-14 rounded-full items-center justify-center ${
                isDisabled
                  ? 'bg-linear-to-r from-secondary to-primary'
                  : 'bg-bg-quaternary'
              }`}
            >
              <ArrowRightIcon color={iconColorConfig.color} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </StyledSafeAreaView>
  );
};

export default CinemaScreen;
