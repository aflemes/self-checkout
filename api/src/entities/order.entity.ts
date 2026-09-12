import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number | string;

  @Column({ name: 'idempotency_key', type: 'char', length: 36, unique: true })
  idempotencyKey: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'PAID', 'CANCELLED', 'FAILED', 'EXPIRED'],
    default: 'PENDING',
  })
  status: string;

  @Column({ name: 'payment_method', type: 'enum', enum: ['CARD', 'PIX'] })
  paymentMethod: string;

  @Column({
    name: 'stripe_intent_id',
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: true,
  })
  stripeIntentId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];
}