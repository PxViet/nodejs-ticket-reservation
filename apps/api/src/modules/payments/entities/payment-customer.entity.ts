import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

// BR-39 / DDR-025: at most one Stripe Customer per user, created lazily on
// the first add-card — never at signup, so registration makes no external call.
@Entity('payment_customers')
export class PaymentCustomer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The one-to-one join adds the unique constraint, whose index doubles as
  // the foreign-key index ADR-013 asks for.
  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'stripe_customer_id', unique: true })
  stripeCustomerId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
