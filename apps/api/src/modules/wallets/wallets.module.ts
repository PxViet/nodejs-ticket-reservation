import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TokenPackage } from './entities/token-package.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { TokenPackagesController } from './token-packages.controller';
import { TokenPackagesService } from './token-packages.service';
import { WalletController } from './wallet.controller';
import { WalletsService } from './wallets.service';

// ADR-017, DDR-024: token wallets, the top-up ledger and the Stripe webhook.
// WalletsService is exported so AuthService.register() can create the wallet
// inside its own transaction (BR-39).
@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, TokenPackage, WalletTransaction]),
  ],
  controllers: [
    TokenPackagesController,
    WalletController,
    StripeWebhookController,
  ],
  providers: [StripeService, WalletsService, TokenPackagesService],
  exports: [TypeOrmModule, WalletsService],
})
export class WalletsModule {}
