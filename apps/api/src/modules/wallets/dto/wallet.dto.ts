import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationMetaDto } from '../../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { WalletTransactionStatus } from '../enums/wallet-transaction-status.enum';
import { WalletTransactionType } from '../enums/wallet-transaction-type.enum';
import { TokenPackageResponseDto } from './token-package.dto';

export class WalletResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'Whole tokens' })
  balance!: number;

  @ApiProperty({ description: 'Whether a card is saved for top-ups' })
  hasPaymentMethod!: boolean;
}

export class WalletTransactionListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WalletTransactionType })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;

  @ApiPropertyOptional({ enum: WalletTransactionStatus })
  @IsOptional()
  @IsEnum(WalletTransactionStatus)
  status?: WalletTransactionStatus;
}

export class WalletTransactionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: WalletTransactionType })
  type!: WalletTransactionType;

  @ApiProperty({ enum: WalletTransactionStatus })
  status!: WalletTransactionStatus;

  @ApiProperty()
  tokens!: number;

  @ApiProperty({ type: Number, nullable: true })
  amountCents!: number | null;

  @ApiProperty({ type: String, nullable: true })
  currency!: string | null;

  @ApiPropertyOptional({ type: TokenPackageResponseDto })
  tokenPackage?: TokenPackageResponseDto;

  @ApiPropertyOptional({
    description: "Stripe's decline reason — safe to show the customer",
  })
  failureMessage?: string;

  @ApiProperty()
  createdAt!: Date;
}

export class PaginatedWalletTransactionResponseDto {
  @ApiProperty({ type: [WalletTransactionResponseDto] })
  data!: WalletTransactionResponseDto[];

  @ApiProperty()
  meta!: PaginationMetaDto;
}
