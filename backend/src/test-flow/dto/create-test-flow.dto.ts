import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { TestFlowCategory } from '@prisma/client';

export class CreateTestFlowDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(TestFlowCategory)
  category!: TestFlowCategory;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  objective?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins une méthode de test est requise' })
  @IsString({ each: true })
  methods!: string[];
}
