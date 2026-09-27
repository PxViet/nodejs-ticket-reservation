import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationMetaDto } from '../../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaymentStatus } from '../enums/payment-status.enum';

export class PaymentListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ description: 'Minor units, e.g. 1700 is $17.00' })
  amountCents!: number;

  @ApiProperty({ example: 'usd' })
  currency!: string;

  @ApiPropertyOptional({ example: 'visa' })
  cardBrand?: string;

  @ApiPropertyOptional({ example: '4242' })
  cardLast4?: string;

  @ApiProperty()
  showtimeId!: string;

  @ApiProperty()
  seatCount!: number;

  @ApiPropertyOptional({ description: 'Set once the payment has succeeded' })
  reservationId?: string;

  @ApiPropertyOptional()
  reservationNumber?: string;

  @ApiPropertyOptional({
    description: 'Why it failed or was refunded — safe to show the customer',
  })
  failureMessage?: string;

  @ApiProperty()
  createdAt!: Date;
}

export class PaginatedPaymentResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  data!: PaymentResponseDto[];

  @ApiProperty()
  meta!: PaginationMetaDto;
}
