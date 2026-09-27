import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaymentResponseDto } from '../payments/dto/payment.dto';
import { CheckoutService } from './checkout.service';
import { CheckoutDto, CheckoutResponseDto } from './dto/checkout.dto';
import { CheckoutStatus } from './enums/checkout-status.enum';

// ADR-018: the only way to confirm a reservation is to pay for it.
@ApiTags('reservations')
@Controller('reservations/checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @ApiOperation({
    summary: 'Pay for held seats with a saved card and confirm the reservation',
  })
  @ApiCreatedResponse({ type: CheckoutResponseDto })
  @ApiAcceptedResponse({ type: CheckoutResponseDto })
  async checkout(
    @Body() dto: CheckoutDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CheckoutResponseDto> {
    const result = await this.checkoutService.checkout(user, dto);

    if (result.status !== CheckoutStatus.SUCCEEDED) {
      res.status(HttpStatus.ACCEPTED);
    }

    return result;
  }

  @Get(':paymentId')
  @ApiOperation({
    summary: 'Poll a checkout payment, settling it from Stripe if pending',
  })
  @ApiOkResponse({ type: PaymentResponseDto })
  findStatus(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentResponseDto> {
    return this.checkoutService.findStatus(user, paymentId);
  }
}
