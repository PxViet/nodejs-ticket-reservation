import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { bigintTransformer } from '../../../database/transformers/bigint.transformer';
import { User } from '../../users/entities/user.entity';
import { WalletTransaction } from './wallet-transaction.entity';

// BR-35: a whole number of tokens, never below 0 — an overdraft is a database
// error, not a bug to find later (DDR-024).
@Check('chk_wallets_balance_non_negative', '"balance" >= 0')
@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // BR-39: exactly one wallet per user. The one-to-one join adds the unique
  // constraint, whose index doubles as the foreign-key index ADR-013 asks for.
  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // DDR-024: written only by the transaction that settles a ledger row as
  // succeeded, under a pessimistic_write lock on this row.
  @Column({
    type: 'bigint',
    default: 0,
    transformer: bigintTransformer,
  })
  balance: number;

  // ADR-017: created lazily on first add-card, never at signup.
  @Column({
    name: 'stripe_customer_id',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  stripeCustomerId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => WalletTransaction, (transaction) => transaction.wallet)
  transactions: WalletTransaction[];
}
