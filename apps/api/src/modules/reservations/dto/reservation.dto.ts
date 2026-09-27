import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationMetaDto } from '../../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ReservationStatus } from '../enums/reservation-status.enum';
import { TicketStatus } from '../enums/ticket-status.enum';

export class ReservationListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReservationStatus })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}

export class TicketResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  seatId!: string;

  @ApiProperty()
  seatLabel!: string;

  @ApiProperty()
  ticketNumber!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty({ enum: TicketStatus })
  status!: TicketStatus;
}

export class ReservationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  reservationNumber!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  showtimeId!: string;

  @ApiProperty({ enum: ReservationStatus })
  status!: ReservationStatus;

  @ApiProperty({ type: [TicketResponseDto] })
  tickets!: TicketResponseDto[];

  @ApiProperty()
  totalSeats!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class ReservationSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  reservationNumber!: string;

  @ApiProperty()
  showtimeId!: string;

  @ApiProperty({ enum: ReservationStatus })
  status!: ReservationStatus;

  @ApiProperty()
  totalSeats!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class PaginatedReservationResponseDto {
  @ApiProperty({ type: [ReservationSummaryResponseDto] })
  data!: ReservationSummaryResponseDto[];

  @ApiProperty()
  meta!: PaginationMetaDto;
}
