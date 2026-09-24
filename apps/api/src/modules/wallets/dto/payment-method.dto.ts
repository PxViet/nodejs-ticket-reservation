import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from '../../../common/dto/paginated-response.dto';

export class SetupIntentResponseDto {
  @ApiProperty()
  setupIntentClientSecret!: string;

  @ApiProperty()
  ephemeralKeySecret!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  publishableKey!: string;
}

export class PaymentMethodResponseDto {
  @ApiProperty({ example: 'pm_1Nx…' })
  id!: string;

  @ApiProperty({ example: 'visa' })
  brand!: string;

  @ApiProperty({ example: '4242' })
  last4!: string;

  @ApiProperty()
  expMonth!: number;

  @ApiProperty()
  expYear!: number;
}

export class PaginatedPaymentMethodResponseDto {
  @ApiProperty({ type: [PaymentMethodResponseDto] })
  data!: PaymentMethodResponseDto[];

  @ApiProperty()
  meta!: PaginationMetaDto;
}
