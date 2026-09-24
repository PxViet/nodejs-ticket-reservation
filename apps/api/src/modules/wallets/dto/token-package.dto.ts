import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from '../../../common/dto/paginated-response.dto';

export class TokenPackageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  tokens!: number;

  @ApiProperty({ description: 'Price in the smallest currency unit' })
  priceCents!: number;

  @ApiProperty({ example: 'usd' })
  currency!: string;
}

export class PaginatedTokenPackageResponseDto {
  @ApiProperty({ type: [TokenPackageResponseDto] })
  data!: TokenPackageResponseDto[];

  @ApiProperty()
  meta!: PaginationMetaDto;
}
