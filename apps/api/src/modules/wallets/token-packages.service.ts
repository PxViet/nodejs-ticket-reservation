import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { TokenPackageResponseDto } from './dto/token-package.dto';
import { TokenPackage } from './entities/token-package.entity';

export function toTokenPackageResponse({
  id,
  code,
  name,
  tokens,
  priceCents,
  currency,
}: TokenPackage): TokenPackageResponseDto {
  return { id, code, name, tokens, priceCents, currency };
}

// DDR-024: a server-owned catalogue, seeded — no admin write routes yet.
@Injectable()
export class TokenPackagesService {
  constructor(
    @InjectRepository(TokenPackage)
    private readonly tokenPackages: Repository<TokenPackage>,
  ) {}

  async findActive({
    page,
    limit,
    skip,
  }: PaginationQueryDto): Promise<
    PaginatedResponseDto<TokenPackageResponseDto>
  > {
    const [tokenPackages, total] = await this.tokenPackages.findAndCount({
      where: { isActive: true },
      order: { sortOrder: 'ASC', tokens: 'ASC' },
      skip,
      take: limit,
    });

    return {
      data: tokenPackages.map(toTokenPackageResponse),
      meta: {
        page,
        limit,
        total,
        hasMore: skip + tokenPackages.length < total,
      },
    };
  }
}
