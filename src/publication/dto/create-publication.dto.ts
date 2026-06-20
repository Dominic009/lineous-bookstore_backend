/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { BookStatus } from '@prisma/client';

export class CreatePublicationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus = BookStatus.PUBLISHED;
}
