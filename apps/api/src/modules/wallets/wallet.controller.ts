import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
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
import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  PaginatedPaymentMethodResponseDto,
  PaymentMethodResponseDto,
  SetupIntentResponseDto,
} from './dto/payment-method.dto';
import {
  CreateTopUpDto,
  TopUpDetailResponseDto,
  TopUpResponseDto,
} from './dto/top-up.dto';
import {
  PaginatedWalletTransactionResponseDto,
  WalletResponseDto,
  WalletTransactionListQueryDto,
  WalletTransactionResponseDto,
} from './dto/wallet.dto';
import { TopUpStatus } from './enums/top-up-status.enum';
import { WalletsService } from './wallets.service';

// Every route acts on the caller's own wallet; none takes a user or wallet
// id (BR-34, BR-38).
@ApiTags('wallet')
@Controller('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @ApiOperation({ summary: "Get the authenticated user's wallet" })
  @ApiOkResponse({ type: WalletResponseDto })
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<WalletResponseDto> {
    return this.walletsService.getMine(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: "List the wallet's ledger, newest first" })
  @ApiOkResponse({ type: PaginatedWalletTransactionResponseDto })
  findTransactions(
    @Query() query: WalletTransactionListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<WalletTransactionResponseDto>> {
    return this.walletsService.findTransactions(user.id, query);
  }

  @Post('payment-methods/setup-intent')
  @ApiOperation({
    summary: "Start adding a card with Stripe's PaymentSheet (setup mode)",
  })
  @ApiCreatedResponse({ type: SetupIntentResponseDto })
  createSetupIntent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SetupIntentResponseDto> {
    return this.walletsService.createSetupIntent(user);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: "List the caller's saved cards" })
  @ApiOkResponse({ type: PaginatedPaymentMethodResponseDto })
  findPaymentMethods(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<PaymentMethodResponseDto>> {
    return this.walletsService.listPaymentMethods(user.id, query);
  }

  @Post('top-ups')
  @ApiOperation({ summary: 'Buy a token package with a saved card' })
  @ApiCreatedResponse({ type: TopUpResponseDto })
  @ApiAcceptedResponse({ type: TopUpResponseDto })
  async topUp(
    @Body() dto: CreateTopUpDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TopUpResponseDto> {
    const result = await this.walletsService.topUp(user.id, dto);

    if (result.status !== TopUpStatus.SUCCEEDED) {
      res.status(HttpStatus.ACCEPTED);
    }

    return result;
  }

  @Get('top-ups/:id')
  @ApiOperation({ summary: "Get one of the caller's top-ups" })
  @ApiOkResponse({ type: TopUpDetailResponseDto })
  findTopUp(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TopUpDetailResponseDto> {
    return this.walletsService.findTopUp(user.id, id);
  }
}
