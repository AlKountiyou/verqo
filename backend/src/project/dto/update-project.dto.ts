import { IsString, IsOptional, IsUrl, MinLength, MaxLength, IsEnum, ValidateIf } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Le nom du projet doit contenir au moins 3 caractères' })
  @MaxLength(100, { message: 'Le nom du projet ne peut pas dépasser 100 caractères' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La description ne peut pas dépasser 500 caractères' })
  description?: string;

  @IsOptional()
  @ValidateIf((o) => o.githubUrl !== null && o.githubUrl !== '')
  @IsUrl({}, { message: 'L\'URL GitHub doit être valide' })
  githubUrl?: string | null;

  @IsOptional()
  @IsUrl({}, { message: 'L\'URL de staging doit être valide' })
  stagingUrl?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
