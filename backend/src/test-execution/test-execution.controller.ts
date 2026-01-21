import { 
  Controller, 
  Post, 
  Get, 
  Param, 
  UseGuards, 
  HttpCode, 
  HttpStatus,
  Query,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { TestExecutionService } from './test-execution.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

@Controller('flows')
@UseGuards(JwtAuthGuard)
export class TestExecutionController {
  constructor(
    private readonly testExecutionService: TestExecutionService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post(':id/run')
  @HttpCode(HttpStatus.OK)
  async runFlow(
    @Param('id') flowId: string,
    @CurrentUser() user: User,
  ) {
    // Check if flow exists and user has access
    const flow = await this.databaseService.testFlow.findUnique({
      where: { id: flowId },
      include: { 
        project: { 
          include: { 
            developers: true,
            owner: true
          } 
        } 
      },
    });

    if (!flow) {
      return { 
        success: false, 
        message: 'Flow de test non trouvé' 
      };
    }

    // Check access permissions
    const hasAccess = 
      user.role === 'ADMIN' ||
      flow.project.ownerId === user.id ||
      flow.project.developers.some((dev) => dev.userId === user.id);

    if (!hasAccess) {
      return { 
        success: false, 
        message: 'Accès refusé à ce flow de test' 
      };
    }

    // Check if flow is already running
    if (flow.status === 'RUNNING') {
      return { 
        success: false, 
        message: 'Ce flow de test est déjà en cours d\'exécution' 
      };
    }

    try {
      const result = await this.testExecutionService.executeTestFlow(
        flowId,
        user.githubAccessToken || undefined,
      );
      return {
        success: true,
        data: { result },
        message: 'Flow exécuté avec succès',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de l\'exécution du flow',
      };
    }
  }

  @Get(':id/results')
  async getFlowResults(
    @Param('id') flowId: string,
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    // Check if flow exists and user has access
    const flow = await this.databaseService.testFlow.findUnique({
      where: { id: flowId },
      include: { 
        project: { 
          include: { 
            developers: true,
            owner: true
          } 
        } 
      },
    });

    if (!flow) {
      return { 
        success: false, 
        message: 'Flow de test non trouvé' 
      };
    }

    // Check access permissions
    const hasAccess = 
      user.role === 'ADMIN' ||
      flow.project.ownerId === user.id ||
      flow.project.developers.some((dev) => dev.userId === user.id);

    if (!hasAccess) {
      return { 
        success: false, 
        message: 'Accès refusé à ce flow de test' 
      };
    }

    try {
      const skip = (page - 1) * limit;
      
      const [results, total] = await Promise.all([
        this.databaseService.testResult.findMany({
          where: { flowId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.databaseService.testResult.count({
          where: { flowId },
        }),
      ]);

      // Parse logs from JSON string
      const resultsWithParsedLogs = results.map(result => ({
        ...result,
        logs: result.logs ? JSON.parse(result.logs) : [],
      }));

      return {
        success: true,
        data: { 
          results: resultsWithParsedLogs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        },
        message: 'Résultats récupérés avec succès',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la récupération des résultats',
      };
    }
  }

  @Get(':id/results/:resultId')
  async getFlowResultDetail(
    @Param('id') flowId: string,
    @Param('resultId') resultId: string,
    @CurrentUser() user: User,
  ) {
    // Check if flow exists and user has access
    const flow = await this.databaseService.testFlow.findUnique({
      where: { id: flowId },
      include: { 
        project: { 
          include: { 
            developers: true,
            owner: true
          } 
        } 
      },
    });

    if (!flow) {
      return { 
        success: false, 
        message: 'Flow de test non trouvé' 
      };
    }

    // Check access permissions
    const hasAccess = 
      user.role === 'ADMIN' ||
      flow.project.ownerId === user.id ||
      flow.project.developers.some((dev) => dev.userId === user.id);

    if (!hasAccess) {
      return { 
        success: false, 
        message: 'Accès refusé à ce flow de test' 
      };
    }

    try {
      const result = await this.databaseService.testResult.findFirst({
        where: { 
          id: resultId,
          flowId 
        },
      });

      if (!result) {
        return { 
          success: false, 
          message: 'Résultat de test non trouvé' 
        };
      }

      // Parse logs from JSON string
      const resultWithParsedLogs = {
        ...result,
        logs: result.logs ? JSON.parse(result.logs) : [],
      };

      return {
        success: true,
        data: { result: resultWithParsedLogs },
        message: 'Détail du résultat récupéré avec succès',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la récupération du détail',
      };
    }
  }

  @Get(':id/status')
  async getFlowStatus(
    @Param('id') flowId: string,
    @CurrentUser() user: User,
  ) {
    // Check if flow exists and user has access
    const flow = await this.databaseService.testFlow.findUnique({
      where: { id: flowId },
      include: { 
        project: { 
          include: { 
            developers: true,
            owner: true
          } 
        } 
      },
    });

    if (!flow) {
      return { 
        success: false, 
        message: 'Flow de test non trouvé' 
      };
    }

    // Check access permissions
    const hasAccess = 
      user.role === 'ADMIN' ||
      flow.project.ownerId === user.id ||
      flow.project.developers.some((dev) => dev.userId === user.id);

    if (!hasAccess) {
      return { 
        success: false, 
        message: 'Accès refusé à ce flow de test' 
      };
    }

    return {
      success: true,
      data: {
        id: flow.id,
        name: flow.name,
        status: flow.status,
        lastRun: flow.lastRun,
        duration: flow.duration,
        category: flow.category,
        methods: flow.methods,
      },
      message: 'Statut récupéré avec succès',
    };
  }

  // Queue stats endpoint removed as execution is now synchronous
}