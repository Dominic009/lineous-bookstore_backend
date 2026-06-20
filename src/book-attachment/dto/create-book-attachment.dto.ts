import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { AttachmentType } from '@prisma/client';

export class CreateBookAttachmentDto {
  @IsString()
  @IsNotEmpty()
  bookId!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsEnum(AttachmentType)
  @IsNotEmpty()
  type!: AttachmentType;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
