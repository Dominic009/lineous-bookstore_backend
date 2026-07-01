import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateSubjectDto {
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
  publicationId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
