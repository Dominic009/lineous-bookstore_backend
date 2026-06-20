import { Module } from '@nestjs/common';
import { BookAttachmentService } from './book-attachment.service';
import { BookAttachmentController } from './book-attachment.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [BookAttachmentController],
  providers: [BookAttachmentService, PrismaService],
  exports: [BookAttachmentService],
})
export class BookAttachmentModule {}
