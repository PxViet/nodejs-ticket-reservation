import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  PaginatedPaymentMethodResponseDto,
  PaymentMethodResponseDto,
  SetupIntentResponseDto,
} from './dto/payment-method.dto';
import { PaymentsService } from './payments.service';

// Every route acts on the caller's own Stripe Customer; none takes a user or
// customer id (BR-34, BR-38).
@ApiTags('payment-methods')
@Controller('payment-methods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('setup-intent')
  @ApiOperation({
    summary: "Start adding a card with Stripe's PaymentSheet (setup mode)",
  })
  @ApiCreatedResponse({ type: SetupIntentResponseDto })
  createSetupIntent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SetupIntentResponseDto> {
    return this.paymentsService.createSetupIntent(user);
  }

  @Get()
  @ApiOperation({ summary: "List the caller's saved cards" })
  @ApiOkResponse({ type: PaginatedPaymentMethodResponseDto })
  findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<PaymentMethodResponseDto>> {
    return this.paymentsService.listPaymentMethods(user.id, query);
  }
}
