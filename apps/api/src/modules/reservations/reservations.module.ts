import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ShowtimesModule } from '../showtimes/showtimes.module';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([SeatHold, Reservation, Ticket]),
    ShowtimesModule,
  ],
  controllers: [
    SeatHoldsController,
    SeatHoldController,
    ReservationsController,
  ],
  providers: [
    SeatHoldsService,
    SeatHoldSweepService,
    ReservationsService,
    ReservationCompletionSweepService,
  ],
  exports: [TypeOrmModule],
})
export class ReservationsModule {}
