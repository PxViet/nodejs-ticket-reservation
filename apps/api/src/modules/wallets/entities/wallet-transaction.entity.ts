import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { WalletTransactionStatus } from '../enums/wallet-transaction-status.enum';
import { WalletTransactionType } from '../enums/wallet-transaction-type.enum';
import { TokenPackage } from './token-package.entity';
import { Wallet } from './wallet.entity';

// DDR-024: the ledger. A row's tokens reach wallets.balance only in the
// transaction that moves it to succeeded.
@Check('chk_wallet_transactions_tokens_positive', '"tokens" > 0')
@Check(
  'chk_wallet_transactions_amount_positive',
  '"amount_cents" IS NULL OR "amount_cents" > 0',
)
@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'wallet_id' })
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ type: 'enum', enum: WalletTransactionType })
  type: WalletTransactionType;

  // BR-40: pending → succeeded | failed
  @Column({
    type: 'enum',
    enum: WalletTransactionStatus,
    default: WalletTransactionStatus.PENDING,
  })
  status: WalletTransactionStatus;

  @Column({ type: 'int' })
  tokens: number;

  // Card money behind the row. Null for the payment/refund types DDR-024
  // reserves, which move tokens only.
  @Column({ name: 'amount_cents', type: 'int', nullable: true })
  amountCents: number | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string | null;

  // Only top_up rows come from a package — Optional, RESTRICT.
  @Index()
  @Column({ name: 'token_package_id', type: 'uuid', nullable: true })
  tokenPackageId: string | null;

  @ManyToOne(() => TokenPackage, (tokenPackage) => tokenPackage.transactions, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'token_package_id' })
  tokenPackage: TokenPackage | null;

  // BR-37: one ledger row per PaymentIntent, so it can be credited only once.
  @Column({
    name: 'stripe_payment_intent_id',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  stripePaymentIntentId: string | null;

  @Column({ name: 'failure_code', type: 'varchar', nullable: true })
  failureCode: string | null;

  @Column({ name: 'failure_message', type: 'varchar', nullable: true })
  failureMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
