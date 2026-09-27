import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

import { CheckoutStatus } from '../enums/checkout-status.enum';
import { ReservationResponseDto } from './reservation.dto';

// BR-36: the holds and the card, nothing else — the amount is priced by the
// server, and the whitelist rejects any field a client adds (DDR-007).
export class CheckoutDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  holdIds!: string[];

  @ApiProperty({ example: 'pm_1Nx…' })
  @IsString()
  @Matches(/^pm_/, { message: 'paymentMethodId must be a Stripe card id' })
  paymentMethodId!: string;
}

export class CheckoutResponseDto {
  @ApiProperty({ enum: CheckoutStatus })
  status!: CheckoutStatus;

  @ApiProperty()
  paymentId!: string;

  @ApiPropertyOptional({
    description:
      'Only when requires_action — pass to handleNextAction for 3-D Secure',
  })
  clientSecret?: string;

  @ApiPropertyOptional({
    type: ReservationResponseDto,
    description: 'Only when succeeded',
  })
  reservation?: ReservationResponseDto;
}
