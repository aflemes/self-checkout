import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('MYSQL_HOST', 'localhost'),
        port: Number(config.get('MYSQL_PORT', '3306')),
        username: config.get('MYSQL_USER', 'checkout'),
        password: config.getOrThrow('MYSQL_PASSWORD'),
        database: config.get('MYSQL_DATABASE', 'self_checkout'),
        charset: 'utf8mb4',
        autoLoadEntities: true,
        synchronize: false,
        timezone: 'Z',
      }),
    }),
    MenuModule,
    OrdersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}