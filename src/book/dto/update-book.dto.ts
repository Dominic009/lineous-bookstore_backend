import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { BookStatus } from '@prisma/client';
import {
  IsDiscountLessThanPrice,
  IsNonNegative,
} from '../../common/validators/book.validators';

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsNumber()
  @IsNonNegative({ message: 'Price must be a non-negative number' })
  price?: number;

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
  status?: BookStatus;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  publicationId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;
}
