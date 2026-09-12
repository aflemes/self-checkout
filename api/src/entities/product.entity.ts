import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryColumn({ length: 40 })
  id: string;

  @Column({ name: 'category_id', type: 'int', unsigned: true })
  categoryId: number;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 255, default: '' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;

  @Column({ type: 'tinyint', default: 1 })
  available: boolean | number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}