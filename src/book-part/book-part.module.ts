import { Module } from '@nestjs/common';
import { BookPartService } from './book-part.service';
import { BookPartController } from './book-part.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [BookPartController],
  providers: [BookPartService, PrismaService],
  exports: [BookPartService],
})
export class BookPartModule {}
