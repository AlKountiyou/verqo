import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { TestExecutionService } from './test-execution.service';
import { TestFlowStatus } from '@prisma/client';

@Injectable()
export class TestSchedulerService {
  private readonly logger = new Logger(TestSchedulerService.name);

  constructor(
    private databaseService: DatabaseService,
    private testExecutionService: TestExecutionService,
  ) {}

  // Exécuter les tests toutes les heures
  @Cron(CronExpression.EVERY_HOUR)
  async executeScheduledTests() {
    this.logger.log('Démarrage de l\'exécution programmée des tests...');

    try {
      // Récupérer tous les flows de test actifs qui ne sont pas en cours d'exécution
      const flows = await this.databaseService.testFlow.findMany({
        where: {
          status: {
            not: TestFlowStatus.RUNNING,
          },
        },
        include: {
          project: true,
        },
      });

      this.logger.log(`${flows.length} flows de test trouvés pour exécution`);

      // Exécuter les tests en parallèle (avec une limite pour éviter la surcharge)
      const batchSize = 5;
      for (let i = 0; i < flows.length; i += batchSize) {
        const batch = flows.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(flow => this.executeFlowIfNeeded(flow.id))
        );
        
        // Attendre un peu entre les batches pour éviter la surcharge
        if (i + batchSize < flows.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      this.logger.log('Exécution programmée des tests terminée');
    } catch (error) {
      this.logger.error('Erreur lors de l\'exécution programmée des tests:', error);
    }
  }

  // Exécuter les tests critiques toutes les 15 minutes
  @Cron('0 */15 * * * *')
  async executeCriticalTests() {
    this.logger.log('Démarrage de l\'exécution des tests critiques...');

    try {
      // Récupérer les flows de test critiques (par exemple, ceux des projets actifs)
      const criticalFlows = await this.databaseService.testFlow.findMany({
        where: {
          status: {
            not: TestFlowStatus.RUNNING,
          },
          project: {
            status: 'ACTIVE',
          },
        },
        include: {
          project: true,
        },
      });

      this.logger.log(`${criticalFlows.length} flows de test critiques trouvés`);

      // Exécuter les tests critiques
      for (const flow of criticalFlows) {
        await this.executeFlowIfNeeded(flow.id);
      }

      this.logger.log('Exécution des tests critiques terminée');
    } catch (error) {
      this.logger.error('Erreur lors de l\'exécution des tests critiques:', error);
    }
  }

  private async executeFlowIfNeeded(flowId: string): Promise<void> {
    try {
      const flow = await this.databaseService.testFlow.findUnique({
        where: { id: flowId },
        include: { project: true },
      });

      if (!flow) {
        this.logger.warn(`Flow ${flowId} non trouvé`);
        return;
      }

      // Vérifier si le flow doit être exécuté
      if (!this.shouldExecuteFlow(flow)) {
        return;
      }

      this.logger.log(`Exécution du flow ${flow.name} (${flow.category})`);
      
      await this.testExecutionService.executeTestFlow(flowId);
    } catch (error) {
      this.logger.error(`Erreur lors de l'exécution du flow ${flowId}:`, error);
    }
  }

  private shouldExecuteFlow(flow: any): boolean {
    // Logique pour déterminer si un flow doit être exécuté
    // Par exemple, basé sur la dernière exécution, la catégorie, etc.

    // Si c'est un test de performance, exécuter moins souvent
    if (flow.category === 'PERFORMANCE') {
      if (!flow.lastRun) return true;
      const hoursSinceLastRun = (Date.now() - flow.lastRun.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastRun >= 6; // Toutes les 6 heures
    }

    // Si c'est un test unitaire, exécuter plus souvent
    if (flow.category === 'UNIT') {
      if (!flow.lastRun) return true;
      const minutesSinceLastRun = (Date.now() - flow.lastRun.getTime()) / (1000 * 60);
      return minutesSinceLastRun >= 30; // Toutes les 30 minutes
    }

    // Pour les autres catégories, exécuter toutes les heures
    if (!flow.lastRun) return true;
    const hoursSinceLastRun = (Date.now() - flow.lastRun.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastRun >= 1;
  }

  // Méthode pour exécuter manuellement un flow
  async executeFlowNow(flowId: string): Promise<void> {
    try {
      await this.testExecutionService.executeTestFlow(flowId);
    } catch (error) {
      this.logger.error(`Erreur lors de l'exécution manuelle du flow ${flowId}:`, error);
      throw error;
    }
  }

  // Méthode pour exécuter tous les flows d'un projet
  async executeProjectFlows(projectId: string): Promise<void> {
    try {
      const flows = await this.databaseService.testFlow.findMany({
        where: { 
          projectId,
          status: { not: TestFlowStatus.RUNNING }
        },
      });

      this.logger.log(`Exécution de ${flows.length} flows pour le projet ${projectId}`);

      for (const flow of flows) {
        await this.executeFlowIfNeeded(flow.id);
      }
    } catch (error) {
      this.logger.error(`Erreur lors de l'exécution des flows du projet ${projectId}:`, error);
      throw error;
    }
  }
}
