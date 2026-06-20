import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { AttachmentType } from '@prisma/client';

export class UpdateBookAttachmentDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsEnum(AttachmentType)
  @IsOptional()
  type?: AttachmentType;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
