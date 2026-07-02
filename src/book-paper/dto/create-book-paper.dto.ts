import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { BookStatus } from '@prisma/client';
import {
  IsNonNegative,
  IsDiscountLessThanPrice,
} from '../../common/validators/book.validators';

export class CreateBookPaperDto {
  @IsString()
  @IsNotEmpty()
  bookId!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @IsNotEmpty()
  @IsNonNegative({ message: 'Price must be non-negative' })
  price!: number;

  @IsOptional()
  @IsNumber()
  @IsNonNegative({ message: 'Discount price must be non-negative' })
  @IsDiscountLessThanPrice('price', { message: 'Discount must be ≤ price' })
  discountPrice?: number;

  @IsOptional()
  @IsDateString()
  discountStartDate?: string;

  @IsOptional()
  @IsDateString()
  discountEndDate?: string;

  @IsOptional()
  @IsNumber()
  @IsNonNegative({ message: 'Stock must be non-negative' })
  stock?: number;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsNumber()
  @IsNonNegative()
  pageCount?: number;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus = BookStatus.PUBLISHED;
}
