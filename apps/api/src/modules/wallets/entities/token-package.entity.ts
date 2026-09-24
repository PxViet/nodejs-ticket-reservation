import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { WalletTransaction } from './wallet-transaction.entity';

// BR-36: the only place a top-up's price, currency and token count come from.
@Check('chk_token_packages_tokens_positive', '"tokens" > 0')
@Check('chk_token_packages_price_positive', '"price_cents" > 0')
@Entity('token_packages')
export class TokenPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'int' })
  tokens: number;

  @Column({ name: 'price_cents', type: 'int' })
  priceCents: number;

  @Column({ type: 'varchar', length: 3, default: 'usd' })
  currency: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => WalletTransaction, (transaction) => transaction.tokenPackage)
  transactions: WalletTransaction[];
}
