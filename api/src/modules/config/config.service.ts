import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get database(): DatabaseConfig {
    return {
      host: this.config.get('MYSQL_HOST', 'localhost'),
      port: Number(this.config.get('MYSQL_PORT', '3306')),
      username: this.config.get('MYSQL_USER', 'checkout'),
      password: this.config.getOrThrow('MYSQL_PASSWORD'),
      database: this.config.get('MYSQL_DATABASE', 'self_checkout'),
    };
  }
}
