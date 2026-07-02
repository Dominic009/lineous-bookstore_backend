import { Module } from '@nestjs/common';
import { BookPaperService } from './book-paper.service';
import { BookPaperController } from './book-paper.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [BookPaperController],
  providers: [BookPaperService, PrismaService],
  exports: [BookPaperService],
})
export class BookPaperModule {}
