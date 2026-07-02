import {
  IsString,
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

export class UpdateBookPaperDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @IsNonNegative({ message: 'Price must be non-negative' })
  price?: number;

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
  @IsNonNegative()
  stock?: number;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsNumber()
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
  status?: BookStatus;
}
