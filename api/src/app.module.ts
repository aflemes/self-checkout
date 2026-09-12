import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from './modules/config/config.module';
import { AppConfigService } from './modules/config/config.service';
import { HealthController } from './health.controller';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { StripeWebhookModule } from './modules/stripe-webhook/stripe-webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'mysql',
        ...config.database,
        charset: 'utf8mb4',
        autoLoadEntities: true,
        synchronize: false,
        timezone: 'Z',
      }),
    }),
    StripeModule,
    MenuModule,
    OrdersModule,
    StripeWebhookModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}