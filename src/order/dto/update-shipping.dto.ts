import { IsNumber, Min } from 'class-validator';

export class UpdateShippingDto {
  @IsNumber()
  @Min(0)
  shipping!: number;
}
