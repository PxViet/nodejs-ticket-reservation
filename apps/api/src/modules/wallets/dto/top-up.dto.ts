import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, Matches } from 'class-validator';

import { WalletTransactionStatus } from '../enums/wallet-transaction-status.enum';
import { TopUpStatus } from '../enums/top-up-status.enum';
import { WalletTransactionResponseDto } from './wallet.dto';

// BR-36: a package id and a saved card — never an amount. The whitelist
// rejects any other field (DDR-007).
export class CreateTopUpDto {
  @ApiProperty()
  @IsUUID()
  tokenPackageId!: string;

  @ApiProperty({ example: 'pm_1Nx…' })
  @IsString()
  @Matches(/^pm_/, {
    message: 'paymentMethodId must be a Stripe PaymentMethod id',
  })
  paymentMethodId!: string;
}

export class TopUpResponseDto {
  @ApiProperty({ enum: TopUpStatus })
  status!: TopUpStatus;

  @ApiProperty()
  transactionId!: string;

  @ApiPropertyOptional({
    type: WalletTransactionResponseDto,
    description: 'Present when status is succeeded',
  })
  transaction?: WalletTransactionResponseDto;

  @ApiPropertyOptional({ description: 'Present when status is succeeded' })
  balance?: number;

  @ApiPropertyOptional({
    description:
      "Present when status is requires_action — pass to Stripe's SDK to complete 3-D Secure",
  })
  clientSecret?: string;
}

export class TopUpDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: WalletTransactionStatus })
  status!: WalletTransactionStatus;

  @ApiProperty()
  tokens!: number;

  @ApiProperty()
  amountCents!: number;

  @ApiProperty()
  currency!: string;

  @ApiPropertyOptional()
  failureMessage?: string;

  @ApiProperty({ description: 'Wallet balance after this top-up, if settled' })
  balance!: number;
}
