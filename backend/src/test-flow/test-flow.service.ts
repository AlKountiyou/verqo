import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTestFlowDto } from './dto/create-test-flow.dto';
import { UpdateTestFlowDto } from './dto/update-test-flow.dto';
import { User, UserRole, TestFlowCategory } from '@prisma/client';

@Injectable()
export class TestFlowService {
  constructor(private readonly db: DatabaseService) {}

  private async canAccessProject(projectId: string, user: User): Promise<boolean> {
    const project = await this.db.project.findUnique({
      where: { id: projectId },
      include: { developers: true },
    });
    if (!project) throw new NotFoundException('Projet non trouvé');
    if (user.role === UserRole.ADMIN) return true;
    if (project.ownerId === user.id) return true;
    const isDev = project.developers.some((d) => d.userId === user.id);
    return isDev;
  }

  async create(projectId: string, dto: CreateTestFlowDto, user: User) {
    const ok = await this.canAccessProject(projectId, user);
    if (!ok) throw new ForbiddenException('Accès refusé');

    const flow = await this.db.testFlow.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        objective: dto.objective,
        methods: dto.methods,
      },
    });
    return flow;
  }

  async list(projectId: string, user: User) {
    const ok = await this.canAccessProject(projectId, user);
    if (!ok) throw new ForbiddenException('Accès refusé');
    return this.db.testFlow.findMany({ where: { projectId } });
  }

  async update(flowId: string, dto: UpdateTestFlowDto, user: User) {
    // Vérifier que le flow existe et récupérer le projet associé
    const flow = await this.db.testFlow.findUnique({
      where: { id: flowId },
      include: { project: { include: { developers: true } } },
    });
    
    if (!flow) throw new NotFoundException('Flow de test non trouvé');
    
    // Vérifier les permissions sur le projet
    const ok = await this.canAccessProject(flow.projectId, user);
    if (!ok) throw new ForbiddenException('Accès refusé');

    // Mettre à jour le flow
    const updatedFlow = await this.db.testFlow.update({
      where: { id: flowId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category && { category: dto.category }),
        ...(dto.objective !== undefined && { objective: dto.objective }),
        ...(dto.methods && { methods: dto.methods }),
      },
    });

    return updatedFlow;
  }

  async findOne(flowId: string, user: User) {
    const flow = await this.db.testFlow.findUnique({
      where: { id: flowId },
      include: { project: { include: { developers: true } } },
    });
    
    if (!flow) throw new NotFoundException('Flow de test non trouvé');
    
    // Vérifier les permissions sur le projet
    const ok = await this.canAccessProject(flow.projectId, user);
    if (!ok) throw new ForbiddenException('Accès refusé');

    return flow;
  }

  async remove(flowId: string, user: User) {
    const flow = await this.db.testFlow.findUnique({
      where: { id: flowId },
      include: { project: { include: { developers: true } } },
    });
    
    if (!flow) throw new NotFoundException('Flow de test non trouvé');
    
    // Vérifier les permissions sur le projet
    const ok = await this.canAccessProject(flow.projectId, user);
    if (!ok) throw new ForbiddenException('Accès refusé');

    await this.db.testFlow.delete({ where: { id: flowId } });
    return { message: 'Flow de test supprimé avec succès' };
  }

  async getFlowResults(flowId: string) {
    return this.db.testResult.findMany({
      where: { flowId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limiter à 50 résultats récents
    });
  }

  async getFlowResultDetail(flowId: string, resultId: string) {
    const result = await this.db.testResult.findFirst({
      where: { 
        id: resultId,
        flowId: flowId 
      },
    });

    if (!result) {
      throw new NotFoundException('Résultat de test non trouvé');
    }

    // Parser les logs JSON si nécessaire
    let parsedLogs = [];
    if (result.logs) {
      try {
        parsedLogs = JSON.parse(result.logs);
      } catch {
        // Si ce n'est pas du JSON, traiter comme du texte simple
        parsedLogs = [result.logs];
      }
    }

    return {
      ...result,
      logs: parsedLogs,
    };
  }
}


