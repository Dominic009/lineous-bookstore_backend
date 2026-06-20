import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  bookId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}
