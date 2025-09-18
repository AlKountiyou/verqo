import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  Patch,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEV)
  async findAll() {
    const users = await this.userService.findAll();
    return {
      success: true,
      data: { users },
      message: 'Utilisateurs récupérés avec succès',
    };
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEV)
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findByIdWithoutPassword(id);
    if (!user) {
      return {
        success: false,
        message: 'Utilisateur non trouvé',
      };
    }
    return {
      success: true,
      data: { user },
      message: 'Utilisateur récupéré avec succès',
    };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    const user = await this.userService.update(id, updateUserDto, currentUser);
    return {
      success: true,
      data: { user },
      message: 'Utilisateur mis à jour avec succès',
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEV)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const result = await this.userService.delete(id, currentUser);
    return {
      success: true,
      data: result,
      message: 'Utilisateur supprimé avec succès',
    };
  }

  @Patch(':id/toggle-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEV)
  @HttpCode(HttpStatus.OK)
  async toggleStatus(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const user = await this.userService.toggleUserStatus(id, currentUser);
    return {
      success: true,
      data: { user },
      message: 'Statut de l\'utilisateur modifié avec succès',
    };
  }
}
