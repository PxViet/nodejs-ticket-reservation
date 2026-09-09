import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  ActiveSeatHoldResponseDto,
  PaginatedSeatHoldResponseDto,
  SeatHoldQueryDto,
} from './dto/seat-hold.dto';
import { SeatHoldsService } from './seat-holds.service';

@ApiTags('seat-holds')
@Controller('seat-holds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SeatHoldController {
  constructor(private readonly seatHoldsService: SeatHoldsService) {}

  @Get('me')
  @ApiOperation({
    summary: "List the authenticated user's active seat holds",
  })
  @ApiOkResponse({ type: PaginatedSeatHoldResponseDto })
  findMine(
    @Query() query: SeatHoldQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<ActiveSeatHoldResponseDto>> {
    return this.seatHoldsService.findMyActiveHolds(user.id, query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Voluntarily release a held seat (owner only)' })
  @ApiNoContentResponse()
  release(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.seatHoldsService.releaseHold(id, user.id);
  }
}
