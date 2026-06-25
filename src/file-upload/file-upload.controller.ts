/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
} from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role, AttachmentType } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  /**
   * Upload a book attachment
   * Access: Admins only
   */
  @Post('book-attachment')
  @UseInterceptors(FileInterceptor('file'))
  uploadBookAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body('bookId') bookId: string,
    @Body('type') type: AttachmentType,
  ) {
    return this.fileUploadService.uploadBookAttachment(file, bookId, type);
  }

  /**
   * Delete a book attachment
   * Access: Admins only
   */
  @Delete('book-attachment/:id')
  remove(@Param('id') id: string) {
    return this.fileUploadService.deleteBookAttachment(id);
  }
}
