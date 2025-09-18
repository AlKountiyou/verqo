import { IsString, IsArray } from 'class-validator';

export class AssignDeveloperDto {
  @IsString()
  userId: string;
}

export class AssignMultipleDevelopersDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
