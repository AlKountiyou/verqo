import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private databaseService: DatabaseService) {}

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.databaseService.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map(({ password, ...user }) => user);
  }

  async findById(id: string): Promise<User | null> {
    return this.databaseService.user.findUnique({
      where: { id },
    });
  }

  async findByIdWithoutPassword(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: User,
  ): Promise<Omit<User, 'password'>> {
    // Vérifier que l'utilisateur existe
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier les permissions
    const canUpdate = this.canModifyUser(currentUser, existingUser);
    if (!canUpdate) {
      throw new ForbiddenException('Permissions insuffisantes pour modifier cet utilisateur');
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.databaseService.user.findFirst({
        where: {
          email: updateUserDto.email,
          id: { not: id },
        },
      });

      if (emailExists) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = { ...updateUserDto };

    // Hash du nouveau mot de passe si fourni
    if (updateUserDto.password) {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    // Seuls les admins peuvent modifier le rôle
    if (updateUserDto.role && currentUser.role !== UserRole.ADMIN) {
      delete updateData.role;
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await this.databaseService.user.update({
      where: { id },
      data: updateData,
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async delete(id: string, currentUser: User): Promise<{ message: string }> {
    // Vérifier que l'utilisateur existe
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier les permissions
    const canDelete = this.canModifyUser(currentUser, existingUser);
    if (!canDelete) {
      throw new ForbiddenException('Permissions insuffisantes pour supprimer cet utilisateur');
    }

    // Empêcher la suppression de son propre compte
    if (currentUser.id === id) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte');
    }

    // Supprimer l'utilisateur (cascade supprimera les refresh tokens)
    await this.databaseService.user.delete({
      where: { id },
    });

    return { message: 'Utilisateur supprimé avec succès' };
  }

  async toggleUserStatus(
    id: string,
    currentUser: User,
  ): Promise<Omit<User, 'password'>> {
    // Vérifier que l'utilisateur existe
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Seuls les admins et devs peuvent modifier le statut
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.DEV) {
      throw new ForbiddenException('Permissions insuffisantes');
    }

    // Empêcher la désactivation de son propre compte
    if (currentUser.id === id) {
      throw new ForbiddenException('Vous ne pouvez pas modifier le statut de votre propre compte');
    }

    // Basculer le statut
    const updatedUser = await this.databaseService.user.update({
      where: { id },
      data: { isActive: !existingUser.isActive },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  private canModifyUser(currentUser: User, targetUser: User): boolean {
    // Les admins peuvent tout modifier
    if (currentUser.role === UserRole.ADMIN) {
      return true;
    }

    // Les devs peuvent modifier les clients et leur propre profil
    if (currentUser.role === UserRole.DEV) {
      return targetUser.role === UserRole.CLIENT || currentUser.id === targetUser.id;
    }

    // Les clients ne peuvent modifier que leur propre profil
    if (currentUser.role === UserRole.CLIENT) {
      return currentUser.id === targetUser.id;
    }

    return false;
  }
}
