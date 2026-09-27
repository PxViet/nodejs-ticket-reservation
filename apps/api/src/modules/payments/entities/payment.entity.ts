import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Reservation } from '../../reservations/entities/reservation.entity';
import { Showtime } from '../../showtimes/entities/showtime.entity';
import { User } from '../../users/entities/user.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

// DDR-025: one row per checkout attempt. A reservation exists only once its
// payment has succeeded — the CHECK makes the reverse a database error.
@Check('chk_payments_amount_positive', '"amount_cents" > 0')
@Check(
  'chk_payments_succeeded_has_reservation',
  `"status" <> 'succeeded' OR "reservation_id" IS NOT NULL`,
)
// ADR-013: a user's payments, newest first, is the history access path; its
// leading column also serves the user_id foreign key.
@Index('idx_payments_user_created', ['userId', 'createdAt'])
@Entity('payments')
export class Payment {
  // Also Stripe's idempotency key and the PaymentIntent's metadata.paymentId.
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // BR-34: always the authenticated user, never a client-supplied id.
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'showtime_id' })
  showtimeId: string;

  @ManyToOne(() => Showtime, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  // Set only by the transaction that marks the payment succeeded. Unique — one
  // payment per reservation — and that index doubles as the FK index.
  @Column({ name: 'reservation_id', type: 'uuid', nullable: true })
  reservationId: string | null;

  @OneToOne(() => Reservation, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation | null;

  // The holds being paid for — ties the payment to its seats before any
  // reservation exists (DDR-025).
  @Column({ name: 'hold_ids', type: 'uuid', array: true })
  holdIds: string[];

  // BR-40: pending → succeeded | failed | refunded
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  // BR-36: priced by the server from showtimes.base_price.
  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ type: 'varchar', length: 3, default: 'usd' })
  currency: string;

  @Column({ name: 'payment_method_id' })
  paymentMethodId: string;

  // Copied at checkout so the history list never calls Stripe.
  @Column({ name: 'card_brand', type: 'varchar', nullable: true })
  cardBrand: string | null;

  @Column({ name: 'card_last4', type: 'varchar', nullable: true })
  cardLast4: string | null;

  // BR-37: one row per PaymentIntent, so it is settled only once.
  @Column({
    name: 'stripe_payment_intent_id',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  stripePaymentIntentId: string | null;

  @Column({
    name: 'stripe_refund_id',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  stripeRefundId: string | null;

  @Column({ name: 'failure_code', type: 'varchar', nullable: true })
  failureCode: string | null;

  @Column({ name: 'failure_message', type: 'varchar', nullable: true })
  failureMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
