import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  Patch,
} from '@nestjs/common';
import { ProjectService } from '../services/project.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { AssignDeveloperDto } from '../dto/assign-developer.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() currentUser: User) {
    const project = await this.projectService.create(createProjectDto, currentUser.id);
    return {
      success: true,
      data: { project },
      message: 'Projet créé avec succès',
    };
  }

  @Get()
  async findAll(@CurrentUser() currentUser: User) {
    const projects = await this.projectService.findAll(currentUser);
    return {
      success: true,
      data: { projects },
      message: 'Projets récupérés avec succès',
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const project = await this.projectService.findOne(id, currentUser);
    return {
      success: true,
      data: { project },
      message: 'Projet récupéré avec succès',
    };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() currentUser: User,
  ) {
    const project = await this.projectService.update(id, updateProjectDto, currentUser);
    return {
      success: true,
      data: { project },
      message: 'Projet mis à jour avec succès',
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const result = await this.projectService.remove(id, currentUser);
    return {
      success: true,
      data: result,
      message: 'Projet supprimé avec succès',
    };
  }

  // Endpoints pour la gestion des développeurs
  @Post(':id/developers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async assignDeveloper(
    @Param('id') id: string,
    @Body() assignDeveloperDto: AssignDeveloperDto,
    @CurrentUser() currentUser: User,
  ) {
    const project = await this.projectService.assignDeveloper(
      id,
      assignDeveloperDto.userId,
      currentUser,
    );
    return {
      success: true,
      data: { project },
      message: 'Développeur assigné avec succès',
    };
  }

  @Delete(':id/developers/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeDeveloper(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: User,
  ) {
    const project = await this.projectService.removeDeveloper(id, userId, currentUser);
    return {
      success: true,
      data: { project },
      message: 'Développeur retiré avec succès',
    };
  }

  @Get(':id/developers')
  async getDevelopers(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const developers = await this.projectService.getDevelopersByProject(id, currentUser);
    return {
      success: true,
      data: { developers },
      message: 'Développeurs du projet récupérés avec succès',
    };
  }

  // Endpoint pour mettre à jour les URLs (GitHub/Staging)
  @Patch(':id/urls')
  @HttpCode(HttpStatus.OK)
  async updateUrls(
    @Param('id') id: string,
    @Body() updateDto: { githubUrl?: string; stagingUrl?: string },
    @CurrentUser() currentUser: User,
  ) {
    const project = await this.projectService.update(id, updateDto, currentUser);
    return {
      success: true,
      data: { project },
      message: 'URLs du projet mises à jour avec succès',
    };
  }
}
