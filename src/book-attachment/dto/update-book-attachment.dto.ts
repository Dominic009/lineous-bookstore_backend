import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { AttachmentType } from '@prisma/client';

export class UpdateBookAttachmentDto {
  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  publicId?: string;

  @IsEnum(AttachmentType)
  @IsOptional()
  type?: AttachmentType;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
