import { IsEmail, IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { Provider } from '@prisma/client';

export class SocialLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsEnum(Provider)
  @IsNotEmpty()
  provider!: Provider;

  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsString()
  firstName?: string;

  @IsString()
  lastName?: string;

  @IsString()
  avatar?: string;
}
