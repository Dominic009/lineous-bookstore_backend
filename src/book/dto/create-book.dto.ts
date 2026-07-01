/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  //   IsDecimal,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { BookStatus } from '@prisma/client';
import {
  IsDiscountLessThanPrice,
  IsNonNegative,
} from '../../common/validators/book.validators';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsNumber()
  @IsNotEmpty()
  @IsNonNegative({ message: 'Price must be a non-negative number' })
  price!: number;

  @IsOptional()
  @IsNumber()
  @IsNonNegative({ message: 'Discount price must be a non-negative number' })
  @IsDiscountLessThanPrice('price', {
    message: 'Discount price must be less than or equal to original price',
  })
  discountPrice?: number;

  @IsOptional()
  @IsDateString()
  publicationDate?: string;

  @IsOptional()
  @IsString()
  edition?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  stock?: boolean;

  @IsOptional()
  @IsNumber()
  @IsNonNegative({ message: 'Stock amount must be a non-negative number' })
  stockAmount?: number;

  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus = BookStatus.DRAFT;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsString()
  @IsNotEmpty()
  publicationId!: string;

  @IsString()
  @IsNotEmpty()
  subjectId!: string;
}
