import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Project, User, UserRole, ProjectDeveloper } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';

type UserSafe = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  emailVerificationToken: string | null;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
};

type ProjectWithDetails = Project & {
  owner: UserSafe;
  developers: Array<{
    id: string;
    assignedAt: Date;
    user: UserSafe;
  }>;
};

@Injectable()
export class ProjectService {
  constructor(private databaseService: DatabaseService) {}

  async create(createProjectDto: CreateProjectDto, ownerId: string): Promise<ProjectWithDetails> {
    // Vérifier si un projet avec le même nom existe déjà pour ce client
    const existingProject = await this.databaseService.project.findFirst({
      where: {
        name: createProjectDto.name,
        ownerId,
      },
    });

    if (existingProject) {
      throw new ConflictException('Un projet avec ce nom existe déjà');
    }

    // Créer le projet
    const project = await this.databaseService.project.create({
      data: {
        ...createProjectDto,
        ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            emailVerificationToken: true,
            resetPasswordToken: true,
            resetPasswordExpires: true,
          },
        },
        developers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                emailVerificationToken: true,
                resetPasswordToken: true,
                resetPasswordExpires: true,
              },
            },
          },
        },
      },
    });

    return project;
  }

  async findAll(currentUser: User): Promise<ProjectWithDetails[]> {
    let whereClause: any;

    // Les admins voient tous les projets
    if (currentUser.role === UserRole.ADMIN) {
      whereClause = {};
    }
    // Les clients ne voient que leurs projets
    else if (currentUser.role === UserRole.CLIENT) {
      whereClause = { ownerId: currentUser.id };
    }
    // Les développeurs voient les projets auxquels ils sont assignés + leurs propres projets s'ils en ont
    else if (currentUser.role === UserRole.DEV) {
      whereClause = {
        OR: [
          { ownerId: currentUser.id },
          { developers: { some: { userId: currentUser.id } } },
        ],
      };
    }

    const projects = await this.databaseService.project.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            emailVerificationToken: true,
            resetPasswordToken: true,
            resetPasswordExpires: true,
          },
        },
        developers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                emailVerificationToken: true,
                resetPasswordToken: true,
                resetPasswordExpires: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects;
  }

  async findOne(id: string, currentUser: User): Promise<ProjectWithDetails> {
    const project = await this.databaseService.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            emailVerificationToken: true,
            resetPasswordToken: true,
            resetPasswordExpires: true,
          },
        },
        developers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                emailVerificationToken: true,
                resetPasswordToken: true,
                resetPasswordExpires: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    // Vérifier les permissions d'accès
    if (!this.canAccessProject(currentUser, project)) {
      throw new ForbiddenException('Accès refusé à ce projet');
    }

    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    currentUser: User,
  ): Promise<ProjectWithDetails> {
    const project = await this.findOne(id, currentUser);

    // Seuls les propriétaires et les admins peuvent modifier un projet
    if (!this.canModifyProject(currentUser, project)) {
      throw new ForbiddenException('Permissions insuffisantes pour modifier ce projet');
    }

    // Vérifier si le nouveau nom n'existe pas déjà
    if (updateProjectDto.name && updateProjectDto.name !== project.name) {
      const existingProject = await this.databaseService.project.findFirst({
        where: {
          name: updateProjectDto.name,
          ownerId: project.ownerId,
          id: { not: id },
        },
      });

      if (existingProject) {
        throw new ConflictException('Un projet avec ce nom existe déjà');
      }
    }

    const updatedProject = await this.databaseService.project.update({
      where: { id },
      data: updateProjectDto,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            emailVerificationToken: true,
            resetPasswordToken: true,
            resetPasswordExpires: true,
          },
        },
        developers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                emailVerificationToken: true,
                resetPasswordToken: true,
                resetPasswordExpires: true,
              },
            },
          },
        },
      },
    });

    return updatedProject;
  }

  async remove(id: string, currentUser: User): Promise<{ message: string }> {
    const project = await this.findOne(id, currentUser);

    // Seuls les propriétaires et les admins peuvent supprimer un projet
    if (!this.canModifyProject(currentUser, project)) {
      throw new ForbiddenException('Permissions insuffisantes pour supprimer ce projet');
    }

    await this.databaseService.project.delete({
      where: { id },
    });

    return { message: 'Projet supprimé avec succès' };
  }

  async assignDeveloper(projectId: string, userId: string, currentUser: User): Promise<ProjectWithDetails> {
    const project = await this.findOne(projectId, currentUser);

    // Seuls les propriétaires et les admins peuvent assigner des développeurs
    if (!this.canModifyProject(currentUser, project)) {
      throw new ForbiddenException('Permissions insuffisantes pour assigner des développeurs');
    }

    // Vérifier que l'utilisateur à assigner est un développeur
    const userToAssign = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!userToAssign) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (userToAssign.role !== UserRole.DEV) {
      throw new BadRequestException('Seuls les développeurs peuvent être assignés aux projets');
    }

    if (!userToAssign.isActive) {
      throw new BadRequestException('Impossible d\'assigner un utilisateur inactif');
    }

    // Vérifier si le développeur n'est pas déjà assigné
    const existingAssignment = await this.databaseService.projectDeveloper.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('Ce développeur est déjà assigné au projet');
    }

    // Assigner le développeur
    await this.databaseService.projectDeveloper.create({
      data: {
        projectId,
        userId,
      },
    });

    // Retourner le projet mis à jour
    return this.findOne(projectId, currentUser);
  }

  async removeDeveloper(projectId: string, userId: string, currentUser: User): Promise<ProjectWithDetails> {
    const project = await this.findOne(projectId, currentUser);

    // Seuls les propriétaires et les admins peuvent retirer des développeurs
    if (!this.canModifyProject(currentUser, project)) {
      throw new ForbiddenException('Permissions insuffisantes pour retirer des développeurs');
    }

    // Vérifier si le développeur est assigné
    const assignment = await this.databaseService.projectDeveloper.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Ce développeur n\'est pas assigné au projet');
    }

    // Retirer le développeur
    await this.databaseService.projectDeveloper.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    // Retourner le projet mis à jour
    return this.findOne(projectId, currentUser);
  }

  private canAccessProject(user: User, project: Project): boolean {
    // Les admins peuvent accéder à tous les projets
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Les propriétaires peuvent accéder à leurs projets
    if (project.ownerId === user.id) {
      return true;
    }

    // Les développeurs peuvent accéder aux projets auxquels ils sont assignés
    if (user.role === UserRole.DEV) {
      const projectWithDevelopers = project as any;
      const assignedDevelopers = Array.isArray(projectWithDevelopers.developers)
        ? projectWithDevelopers.developers
        : [];
      const isAssigned = assignedDevelopers.some((dev: any) => {
        // support both shapes: { user: { id } } and { userId }
        return (dev?.user?.id && dev.user.id === user.id) || (dev?.userId && dev.userId === user.id);
      });
      if (isAssigned) {
        return true;
      }
    }

    return false;
  }

  private canModifyProject(user: User, project: Project): boolean {
    // Les admins peuvent modifier tous les projets
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Les propriétaires peuvent modifier leurs projets
    if (project.ownerId === user.id) {
      return true;
    }

    // Les développeurs assignés peuvent également modifier le projet
    if (user.role === UserRole.DEV) {
      const projectWithDevelopers = project as any;
      const assignedDevelopers = Array.isArray(projectWithDevelopers.developers)
        ? projectWithDevelopers.developers
        : [];
      const isAssigned = assignedDevelopers.some((dev: any) => {
        return (dev?.user?.id && dev.user.id === user.id) || (dev?.userId && dev.userId === user.id);
      });
      if (isAssigned) {
        return true;
      }
    }

    return false;
  }

  async getDevelopersByProject(projectId: string, currentUser: User): Promise<Array<UserSafe>> {
    const project = await this.findOne(projectId, currentUser);

    const developers = await this.databaseService.projectDeveloper.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            emailVerificationToken: true,
            resetPasswordToken: true,
            resetPasswordExpires: true,
          },
        },
      },
    });

    return developers.map(assignment => assignment.user);
  }
}
