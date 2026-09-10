import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

// Unwind
import { withUniwind } from 'uniwind';

// Constants
import { Size, UNACTIVE_MESSAGE } from '@/constants';

// Utils
import { capitalize } from '@/utils/convert';
import { formatDate, formatIDR, formatTime } from '@/utils/formats';

// Hooks
import { useReservation } from '@/features/booking/hooks/useReservations';

// Types
import { toDisplayStatus } from '@/features/booking/schemas/reservation';

// Components
import { Button } from '@/components/Button';
import { DetailRow } from '@/components/DetailRow';
import { Divider } from '@/components/Divider';
import { HorizontalCard } from '@/components/HorizontalCard';
import { Typo } from '@/components/Typo';
import { TicketDetailSkeleton } from '@/features/ticket/components/TicketDetailSkeleton';

const StyledSafeAreaView = withUniwind(SafeAreaView);
const StyledScrollView = withUniwind(ScrollView);

const TicketDetailScreen = () => {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id || '';

  const {
    data: reservation,
    isLoading,
    isError,
    refetch: refetchTicket,
  } = useReservation(id);

  const ticketDetail = useMemo(() => {
    if (!reservation) return null;

    const { movie, showTime, showDate } = reservation.showtime || {};

    if (!movie) return null;

    return {
      movie,
      movieName: movie.title,
      seatLabels: reservation.tickets.map(ticket => ticket.seatLabel),
      paid: formatIDR(reservation.totalAmount),
      showTime,
      showDate,
      // Cosmetic only — the API has no `qrCodeData` field and no scan/validate
      // endpoint, so scanning this has no backend effect yet.
      qrCode: JSON.stringify({
        reservationId: reservation.id,
        reservationNumber: reservation.reservationNumber,
      }),
      idOrder: reservation.reservationNumber,
      status: toDisplayStatus(reservation.status),
    };
  }, [reservation]);

  // Determine if QR should be shown
  const isActive = ticketDetail?.status === 'active';

  const orderRows = useMemo(
    () => [
      {
        label: 'Date & Time',
        value: `${formatDate(ticketDetail?.showDate || '')}, ${formatTime(
          ticketDetail?.showTime || '',
        )}`,
        testID: 'order-datetime',
      },
      {
        label: 'Seat Number',
        value: ticketDetail?.seatLabels.join(', ') || '',
        testID: 'order-seats',
      },
      {
        label: 'Paid',
        value: ticketDetail?.paid || '',
        testID: 'paid',
      },
      {
        label: 'Status',
        value: capitalize(ticketDetail?.status || ''),
        testID: 'ticket-status',
      },
    ],
    [ticketDetail],
  );

  const unActiveMessage = UNACTIVE_MESSAGE[ticketDetail?.status || ''] || '';

  return (
    <StyledSafeAreaView
      edges={['bottom']}
      accessibilityLabel="Ticket Detail screen"
      accessibilityHint="Ticket Detail screen"
      className="flex-1 bg-bg-primary"
    >
      <StyledScrollView
        contentContainerClassName="flex-1 px-6 justify-between"
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <TicketDetailSkeleton />
        ) : isError || !ticketDetail ? (
          <Button
            size={Size.EXTRA_SMALL}
            title="Retry"
            onPress={refetchTicket}
            accessibilityRole="button"
            accessibilityLabel="Retry loading ticket"
          />
        ) : (
          <View className="bg-deep-blue px-4 py-6 rounded-xl gap-3.5">
            {/* Movie Details Section */}
            <HorizontalCard justifyContent="center" {...ticketDetail?.movie} />

            {/* Order Details Section */}
            <View className="gap-4 pt-6.5">
              {orderRows.map(row => (
                <DetailRow
                  key={row.testID}
                  label={row.label}
                  value={row.value}
                  testID={row.testID}
                  valueClassName={
                    row.testID === 'ticket-status'
                      ? isActive
                        ? 'text-text-success'
                        : 'text-text-error'
                      : undefined
                  }
                />
              ))}
            </View>

            <Divider className="border-dashed" />

            {/* QR Code Section - Only show if active */}
            {isActive ? (
              <View className="items-center justify-center gap-2">
                <View className="w-[200] h-[200] items-center justify-center bg-white">
                  <QRCode
                    value={ticketDetail?.qrCode}
                    size={174}
                    color="black"
                    backgroundColor="white"
                  />
                </View>
                <View className="justify-between items-center">
                  <Typo
                    size="base"
                    weight="regular"
                    className="text-overlay-soft"
                  >
                    ID Order
                  </Typo>
                  <Typo size="base" weight="regular" className="text-center">
                    {ticketDetail?.idOrder}
                  </Typo>
                </View>
              </View>
            ) : (
              <Typo
                size="base"
                weight="regular"
                className="text-center italic text-overlay-soft"
              >
                {unActiveMessage}
              </Typo>
            )}
          </View>
        )}
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};

export default TicketDetailScreen;
