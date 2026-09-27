import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentCustomer } from './entities/payment-customer.entity';
import { Payment } from './entities/payment.entity';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';

// ADR-018, DDR-025: Stripe customers, saved cards and checkout payments.
// ReservationsModule imports this one to charge at checkout — never the
// reverse — so the dependency runs one way.
@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentCustomer])],
  controllers: [PaymentMethodsController, PaymentsController],
  providers: [StripeService, PaymentsService],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
