import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSettingDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;
}
