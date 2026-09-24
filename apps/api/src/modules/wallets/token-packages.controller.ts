import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  PaginatedTokenPackageResponseDto,
  TokenPackageResponseDto,
} from './dto/token-package.dto';
import { TokenPackagesService } from './token-packages.service';

@ApiTags('wallet')
@Controller('token-packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TokenPackagesController {
  constructor(private readonly tokenPackagesService: TokenPackagesService) {}

  @Get()
  @ApiOperation({ summary: 'List active token packages, in display order' })
  @ApiOkResponse({ type: PaginatedTokenPackageResponseDto })
  findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<TokenPackageResponseDto>> {
    return this.tokenPackagesService.findActive(query);
  }
}
