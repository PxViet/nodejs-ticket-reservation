import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  PaginatedReservationResponseDto,
  ReservationListQueryDto,
  ReservationResponseDto,
  ReservationSummaryResponseDto,
} from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
// Confirming a reservation is POST /reservations/checkout (ADR-018).
@Controller('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // Registered before ':id' so 'me' isn't swallowed as an :id param.
  @Get('me')
  @ApiOperation({ summary: "List the authenticated user's reservations" })
  @ApiOkResponse({ type: PaginatedReservationResponseDto })
  findMine(
    @Query() query: ReservationListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<ReservationSummaryResponseDto>> {
    return this.reservationsService.findMine(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one reservation (owner or admin)' })
  @ApiOkResponse({ type: ReservationResponseDto })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.findOne(id, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a confirmed reservation (owner only)' })
  @ApiOkResponse({ type: ReservationResponseDto })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.cancel(id, user.id);
  }
}
