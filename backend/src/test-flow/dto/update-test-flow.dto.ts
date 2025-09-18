import { IsString, IsOptional, IsEnum, IsArray, ArrayMinSize } from 'class-validator';
import { TestFlowCategory } from '@prisma/client';

export class UpdateTestFlowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TestFlowCategory, { message: 'Catégorie de flow invalide' })
  category?: TestFlowCategory;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsArray({ message: 'Les méthodes de test doivent être un tableau' })
  @IsString({ each: true, message: 'Chaque méthode doit être une chaîne de caractères' })
  @ArrayMinSize(1, { message: 'Au moins une méthode de test est requise' })
  methods?: string[];
}
