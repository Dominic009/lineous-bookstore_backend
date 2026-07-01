import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  publicationId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
