import { Module } from '@nestjs/common';
import { BookAttachmentService } from './book-attachment.service';
import { BookAttachmentController } from './book-attachment.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [BookAttachmentController],
  providers: [BookAttachmentService, PrismaService],
  exports: [BookAttachmentService],
})
export class BookAttachmentModule {}
