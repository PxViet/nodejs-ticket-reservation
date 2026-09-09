import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { PaginationMetaDto } from '../../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SeatHoldStatus } from '../enums/seat-hold-status.enum';

export class CreateSeatHoldDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  seatIds!: string[];
}

export class SeatHoldResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  seatId!: string;

  @ApiProperty()
  seatLabel!: string;

  @ApiProperty()
  showtimeId!: string;

  @ApiProperty({ enum: SeatHoldStatus })
  status!: SeatHoldStatus;

  @ApiProperty()
  heldUntil!: Date;
}

export class HoldSeatsResponseDto {
  @ApiProperty({ type: [SeatHoldResponseDto] })
  holds!: SeatHoldResponseDto[];
}

export class SeatHoldQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  showtimeId?: string;
}

export class ActiveSeatHoldResponseDto extends SeatHoldResponseDto {
  @ApiProperty()
  price!: number;
}

export class PaginatedSeatHoldResponseDto {
  @ApiProperty({ type: [ActiveSeatHoldResponseDto] })
  data!: ActiveSeatHoldResponseDto[];

  @ApiProperty()
  meta!: PaginationMetaDto;
}
