import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Delete, UseGuards } from '@nestjs/common';
import { TestFlowService } from './test-flow.service';
import { TestExecutionService } from '../test-execution/test-execution.service';
import { CreateTestFlowDto } from './dto/create-test-flow.dto';
import { UpdateTestFlowDto } from './dto/update-test-flow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('projects/:projectId/flows')
@UseGuards(JwtAuthGuard)
export class TestFlowController {
  constructor(
    private readonly service: TestFlowService,
    private readonly testExecutionService: TestExecutionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTestFlowDto,
    @CurrentUser() user: User,
  ) {
    const flow = await this.service.create(projectId, dto, user);
    return { success: true, data: { flow }, message: 'Flow créé avec succès' };
  }

  @Get()
  async list(@Param('projectId') projectId: string, @CurrentUser() user: User) {
    const flows = await this.service.list(projectId, user);
    return { success: true, data: { flows }, message: 'Flows récupérés avec succès' };
  }

  @Get(':flowId')
  async findOne(
    @Param('projectId') projectId: string,
    @Param('flowId') flowId: string,
    @CurrentUser() user: User,
  ) {
    const flow = await this.service.findOne(flowId, user);
    return { success: true, data: { flow }, message: 'Flow récupéré avec succès' };
  }

  @Put(':flowId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('projectId') projectId: string,
    @Param('flowId') flowId: string,
    @Body() dto: UpdateTestFlowDto,
    @CurrentUser() user: User,
  ) {
    const flow = await this.service.update(flowId, dto, user);
    return { success: true, data: { flow }, message: 'Flow mis à jour avec succès' };
  }

  @Delete(':flowId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('projectId') projectId: string,
    @Param('flowId') flowId: string,
    @CurrentUser() user: User,
  ) {
    const result = await this.service.remove(flowId, user);
    return { success: true, data: result, message: 'Flow supprimé avec succès' };
  }

  @Post(':flowId/run')
  @HttpCode(HttpStatus.OK)
  async runFlow(
    @Param('projectId') projectId: string,
    @Param('flowId') flowId: string,
    @CurrentUser() user: User,
  ) {
    // Vérifier que l'utilisateur a accès au flow
    await this.service.findOne(flowId, user);

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

  @Get(':flowId/results')
  async getFlowResults(
    @Param('projectId') projectId: string,
    @Param('flowId') flowId: string,
    @CurrentUser() user: User,
  ) {
    // Vérifier que l'utilisateur a accès au flow
    await this.service.findOne(flowId, user);

    const results = await this.service.getFlowResults(flowId);
    return {
      success: true,
      data: { results },
      message: 'Résultats récupérés avec succès',
    };
  }

  @Get(':flowId/results/:resultId')
  async getFlowResultDetail(
    @Param('projectId') projectId: string,
    @Param('flowId') flowId: string,
    @Param('resultId') resultId: string,
    @CurrentUser() user: User,
  ) {
    // Vérifier que l'utilisateur a accès au flow
    await this.service.findOne(flowId, user);

    const result = await this.service.getFlowResultDetail(flowId, resultId);
    return {
      success: true,
      data: { result },
      message: 'Détail du résultat récupéré avec succès',
    };
  }
}


