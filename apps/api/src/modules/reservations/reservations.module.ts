import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentsModule } from '../payments/payments.module';
import { ShowtimesModule } from '../showtimes/showtimes.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { Reservation } from './entities/reservation.entity';
import { SeatHold } from './entities/seat-hold.entity';
import { Ticket } from './entities/ticket.entity';
import { ReservationCompletionSweepService } from './reservation-completion-sweep.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { SeatHoldController } from './seat-hold.controller';
import { SeatHoldSweepService } from './seat-hold-sweep.service';
import { SeatHoldsController } from './seat-holds.controller';
import { SeatHoldsService } from './seat-holds.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SeatHold, Reservation, Ticket]),
    ShowtimesModule,
    PaymentsModule,
  ],
  // CheckoutController before ReservationsController, so 'checkout' is not
  // swallowed as an :id param.
  controllers: [
    SeatHoldsController,
    SeatHoldController,
    CheckoutController,
    ReservationsController,
    StripeWebhookController,
  ],
  providers: [
    SeatHoldsService,
    SeatHoldSweepService,
    ReservationsService,
    CheckoutService,
    ReservationCompletionSweepService,
  ],
  exports: [TypeOrmModule],
})
export class ReservationsModule {}
