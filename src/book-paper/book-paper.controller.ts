/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { BookPaperService } from './book-paper.service';
import { CreateBookPaperDto } from './dto/create-book-paper.dto';
import { UpdateBookPaperDto } from './dto/update-book-paper.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('book-papers')
export class BookPaperController {
  constructor(
    private readonly bookPaperService: BookPaperService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('thumbnail'))
  create(
    @Body() dto: CreateBookPaperDto,
    @Request() req: RequestWithUser,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.bookPaperService.create(dto, req.user.role, thumbnail);
  }

  @Get('book/:bookId')
  findAll(@Param('bookId') bookId: string, @Request() req: RequestWithUser) {
    return this.bookPaperService.findAll(bookId, req?.user?.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bookPaperService.findOne(id, req?.user?.role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('thumbnail'))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookPaperDto,
    @Request() req: RequestWithUser,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.bookPaperService.update(id, dto, req.user.role, thumbnail);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bookPaperService.remove(id, req.user.role);
  }
}
