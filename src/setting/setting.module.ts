import { Module } from '@nestjs/common';
import { SettingService } from './setting.service';
import { SettingController } from './setting.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SettingController],
  providers: [SettingService, PrismaService],
  exports: [SettingService],
})
export class SettingModule {}
