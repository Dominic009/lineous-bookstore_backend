import { IsString, IsOptional, IsEnum } from 'class-validator';
import { BookStatus } from '@prisma/client';

export class UpdatePublicationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus;
}
