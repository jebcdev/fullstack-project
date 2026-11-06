import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateService } from './private.service';
import { PrivateController } from './private.controller';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  controllers: [PrivateController],
  providers: [PrivateService],
})
export class PrivateModule {}
