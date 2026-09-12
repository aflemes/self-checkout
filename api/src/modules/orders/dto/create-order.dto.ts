import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../payment-method';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/)
  productId: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

export class PaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}

export class CreateOrderDto {
  @IsUUID('4')
  idempotencyKey: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ValidateNested()
  @Type(() => PaymentDto)
  payment: PaymentDto;
}