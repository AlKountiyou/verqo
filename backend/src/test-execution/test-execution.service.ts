import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TestFlow, TestFlowCategory, TestResultStatus } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TestExecutionGateway } from './test-execution.gateway';

const execAsync = promisify(exec);

export interface TestExecutionResult {
  success: boolean;
  duration: number;
  logs: string;
  errorMessage?: string;
}

@Injectable()
export class TestExecutionService {
  private readonly logger = new Logger(TestExecutionService.name);

  constructor(
    private databaseService: DatabaseService,
    private gateway: TestExecutionGateway,
  ) {}

  async executeTestFlow(flowId: string, githubAccessToken?: string): Promise<TestExecutionResult> {
    const flow = await this.databaseService.testFlow.findUnique({
      where: { id: flowId },
      include: { project: true },
    });

    if (!flow) {
      throw new Error('Flow de test non trouvé');
    }

    // Mettre à jour le statut du flow
    await this.databaseService.testFlow.update({
      where: { id: flowId },
      data: { status: 'RUNNING' },
    });
    this.gateway.emitFlowStatus({
      flowId,
      status: 'RUNNING',
      lastRun: new Date(),
    });

    const startTime = Date.now();
    let result: TestExecutionResult;

    try {
      this.logger.log(`Exécution du flow ${flow.name} (${flow.category})`);

      switch (flow.category) {
        case TestFlowCategory.BACKEND:
          result = await this.executeBackendTests(flow, githubAccessToken);
          break;
        case TestFlowCategory.FRONTEND:
          result = await this.executeFrontendTests(flow, githubAccessToken);
          break;
        case TestFlowCategory.PERFORMANCE:
          result = await this.executePerformanceTests(flow);
          break;
        case TestFlowCategory.UNIT:
          result = await this.executeUnitTests(flow, githubAccessToken);
          break;
        default:
          throw new Error(`Catégorie de test non supportée: ${flow.category}`);
      }

      const duration = Date.now() - startTime;

      // Sauvegarder le résultat
      const savedResult = await this.saveTestResult(flowId, result, duration);

      // Mettre à jour le flow
      await this.databaseService.testFlow.update({
        where: { id: flowId },
        data: {
          status: result.success ? 'SUCCESS' : 'FAILED',
          lastRun: new Date(),
          duration,
        },
      });
      this.gateway.emitFlowStatus({
        flowId,
        status: result.success ? 'SUCCESS' : 'FAILED',
        lastRun: new Date(),
        duration,
        resultId: savedResult.id,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      this.logger.error(
        `Erreur lors de l'exécution du flow ${flow.name}:`,
        error,
      );

      // Sauvegarder l'erreur
      await this.saveTestResult(
        flowId,
        {
          success: false,
          duration,
          logs: '',
          errorMessage,
        },
        duration,
      );

      // Mettre à jour le flow
      await this.databaseService.testFlow.update({
        where: { id: flowId },
        data: {
          status: 'FAILED',
          lastRun: new Date(),
          duration,
        },
      });
      this.gateway.emitFlowStatus({
        flowId,
        status: 'FAILED',
        lastRun: new Date(),
        duration,
      });

      return {
        success: false,
        duration,
        logs: '',
        errorMessage,
      };
    }
  }

  private async executeBackendTests(
    flow: TestFlow & { project: any },
    githubAccessToken?: string,
  ): Promise<TestExecutionResult> {
    const project = flow.project;
    const logs: string[] = [];

    try {
      // Vérifier si le projet a une URL GitHub
      if (!project.githubUrl) {
        throw new Error(
          'Le projet doit avoir une URL GitHub configurée pour exécuter les tests backend',
        );
      }

      // Cloner ou mettre à jour le repository
      const repoPath = await this.cloneOrUpdateRepository(
        project.githubUrl,
        logs,
        githubAccessToken,
      );

      // Exécuter les tests backend selon les méthodes définies
      for (const method of flow.methods) {
        const methodResult = await this.executeBackendMethod(
          repoPath,
          method,
          logs,
        );
        if (!methodResult.success) {
          return {
            success: false,
            duration: 0,
            logs: logs.join('\n'),
            errorMessage: `Échec de la méthode: ${method}`,
          };
        }
      }

      return {
        success: true,
        duration: 0,
        logs: logs.join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        duration: 0,
        logs: logs.join('\n'),
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async executeFrontendTests(
    flow: TestFlow & { project: any },
    githubAccessToken?: string,
  ): Promise<TestExecutionResult> {
    const project = flow.project;
    const logs: string[] = [];

    try {
      if (!project.githubUrl) {
        throw new Error(
          'Le projet doit avoir une URL GitHub configurée pour exécuter les tests frontend',
        );
      }

      const repoPath = await this.cloneOrUpdateRepository(
        project.githubUrl,
        logs,
        githubAccessToken,
      );

      // Exécuter les tests frontend
      for (const method of flow.methods) {
        const methodResult = await this.executeFrontendMethod(
          repoPath,
          method,
          logs,
        );
        if (!methodResult.success) {
          return {
            success: false,
            duration: 0,
            logs: logs.join('\n'),
            errorMessage: `Échec de la méthode: ${method}`,
          };
        }
      }

      return {
        success: true,
        duration: 0,
        logs: logs.join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        duration: 0,
        logs: logs.join('\n'),
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async executePerformanceTests(
    flow: TestFlow & { project: any },
  ): Promise<TestExecutionResult> {
    const project = flow.project;
    const logs: string[] = [];

    try {
      if (!project.stagingUrl) {
        throw new Error(
          'Le projet doit avoir une URL de staging configurée pour exécuter les tests de performance',
        );
      }

      // Exécuter les tests de performance
      for (const method of flow.methods) {
        const methodResult = await this.executePerformanceMethod(
          project.stagingUrl,
          method,
          logs,
        );
        if (!methodResult.success) {
          return {
            success: false,
            duration: 0,
            logs: logs.join('\n'),
            errorMessage: `Échec de la méthode: ${method}`,
          };
        }
      }

      return {
        success: true,
        duration: 0,
        logs: logs.join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        duration: 0,
        logs: logs.join('\n'),
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async executeUnitTests(
    flow: TestFlow & { project: any },
    githubAccessToken?: string,
  ): Promise<TestExecutionResult> {
    const project = flow.project;
    const logs: string[] = [];

    try {
      if (!project.githubUrl) {
        throw new Error(
          'Le projet doit avoir une URL GitHub configurée pour exécuter les tests unitaires',
        );
      }

      const repoPath = await this.cloneOrUpdateRepository(
        project.githubUrl,
        logs,
        githubAccessToken,
      );

      // Exécuter les tests unitaires
      for (const method of flow.methods) {
        const methodResult = await this.executeUnitMethod(
          repoPath,
          method,
          logs,
        );
        if (!methodResult.success) {
          return {
            success: false,
            duration: 0,
            logs: logs.join('\n'),
            errorMessage: `Échec de la méthode: ${method}`,
          };
        }
      }

      return {
        success: true,
        duration: 0,
        logs: logs.join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        duration: 0,
        logs: logs.join('\n'),
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async cloneOrUpdateRepository(
    githubUrl: string,
    logs: string[],
    githubAccessToken?: string,
  ): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp', 'repos');
    const repoName = this.extractRepoName(githubUrl);
    const repoPath = path.join(tempDir, repoName);
    const authUrl = githubAccessToken
      ? this.buildAuthenticatedUrl(githubUrl, githubAccessToken)
      : githubUrl;

    try {
      // Créer le dossier temp s'il n'existe pas
      await fs.mkdir(tempDir, { recursive: true });

      // Vérifier si le repo existe déjà
      try {
        await fs.access(repoPath);
        logs.push(`Mise à jour du repository ${repoName}...`);
        if (githubAccessToken) {
          await execAsync(`git remote set-url origin ${authUrl}`, { cwd: repoPath });
        }
        await execAsync('git pull', { cwd: repoPath });
        if (githubAccessToken) {
          await execAsync(`git remote set-url origin ${githubUrl}`, { cwd: repoPath });
        }
      } catch {
        logs.push(`Clonage du repository ${repoName}...`);
        await execAsync(`git clone ${authUrl} ${repoPath}`);
        if (githubAccessToken) {
          await execAsync(`git remote set-url origin ${githubUrl}`, { cwd: repoPath });
        }
      }

      return repoPath;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      if (
        message.includes('Authentication failed') ||
        message.includes('Repository not found') ||
        message.toLowerCase().includes('access denied')
      ) {
        throw new Error('Accès refusé au repository GitHub. Vérifiez le token.');
      }
      throw new Error(`Erreur lors du clonage/mise à jour du repository: ${message}`);
    }
  }

  private buildAuthenticatedUrl(githubUrl: string, token: string): string {
    return githubUrl.replace(
      'https://github.com/',
      `https://x-access-token:${token}@github.com/`,
    );
  }

  private extractRepoName(githubUrl: string): string {
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      throw new Error('URL GitHub invalide');
    }
    return `${match[1]}-${match[2].replace('.git', '')}`;
  }

  private async executeBackendMethod(
    repoPath: string,
    method: string,
    logs: string[],
  ): Promise<{ success: boolean }> {
    try {
      logs.push(`Exécution de la méthode backend: ${method}`);

      // Essayer avec npm test
      try {
        logs.push('Tentative d\'exécution avec npm test...');
        const { stdout } = await execAsync('npm test', { cwd: repoPath });
        logs.push(stdout);
        return { success: true };
      } catch (error) {
        logs.push(`npm test échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      // Essayer avec Jest directement
      try {
        logs.push('Tentative d\'exécution avec Jest...');
        const { stdout } = await execAsync('npx jest', { cwd: repoPath });
        logs.push(stdout);
        return { success: true };
      } catch (error) {
        logs.push(`Jest échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      logs.push('Aucune méthode de test backend trouvée');
      return { success: false };
    } catch (error) {
      logs.push(`Erreur lors de l'exécution de la méthode backend: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return { success: false };
    }
  }

  private async executeFrontendMethod(
    repoPath: string,
    method: string,
    logs: string[],
  ): Promise<{ success: boolean }> {
    try {
      logs.push(`Exécution de la méthode frontend: ${method}`);

      // Essayer les commandes de test génériques
      const testCommands = ['npm test', 'yarn test', 'npm run test'];

      for (const command of testCommands) {
        try {
          logs.push(`Tentative avec: ${command}`);
          const { stdout } = await execAsync(command, { cwd: repoPath });
          logs.push(stdout);
          return { success: true };
        } catch (error) {
          logs.push(`${command} échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }

      logs.push('Aucune méthode de test frontend trouvée');
      return { success: false };
    } catch (error) {
      logs.push(`Erreur lors de l'exécution de la méthode frontend: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return { success: false };
    }
  }

  private async executePerformanceMethod(
    stagingUrl: string,
    method: string,
    logs: string[],
  ): Promise<{ success: boolean }> {
    try {
      logs.push(`Exécution de la méthode de performance: ${method}`);

      // Utiliser Lighthouse pour les tests de performance
      if (method.toLowerCase().includes('lighthouse') || method.toLowerCase().includes('performance')) {
        logs.push('Exécution des tests Lighthouse...');

        try {
          const { stdout } = await execAsync(
            `npx lighthouse ${stagingUrl} --output=json --chrome-flags="--headless"`,
          );
          const lighthouseResult = JSON.parse(stdout);

          const performanceScore = lighthouseResult.categories.performance.score * 100;
          logs.push(`Score de performance: ${performanceScore}%`);

          // Considérer comme réussi si le score est > 70
          return { success: performanceScore > 70 };
        } catch (error) {
          logs.push(`Lighthouse échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }

      logs.push('Méthode de performance non reconnue');
      return { success: false };
    } catch (error) {
      logs.push(`Erreur lors de l'exécution de la méthode de performance: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return { success: false };
    }
  }

  private async executeUnitMethod(
    repoPath: string,
    method: string,
    logs: string[],
  ): Promise<{ success: boolean }> {
    try {
      logs.push(`Exécution de la méthode unitaire: ${method}`);

      // Essayer différentes commandes de test unitaire
      const testCommands = [
        'npm test',
        'npm run test:unit',
        'npx jest --testPathPattern=unit',
        'yarn test',
      ];

      for (const command of testCommands) {
        try {
          logs.push(`Tentative avec: ${command}`);
          const { stdout } = await execAsync(command, { cwd: repoPath });
          logs.push(stdout);
          return { success: true };
        } catch (error) {
          logs.push(`${command} échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }

      logs.push('Aucune méthode de test unitaire trouvée');
      return { success: false };
    } catch (error) {
      logs.push(`Erreur lors de l'exécution de la méthode unitaire: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return { success: false };
    }
  }

  private async saveTestResult(
    flowId: string,
    result: TestExecutionResult,
    duration: number,
  ) {
    return this.databaseService.testResult.create({
      data: {
        flowId,
        status: result.success
          ? TestResultStatus.SUCCESS
          : TestResultStatus.FAILED,
        startedAt: new Date(Date.now() - duration),
        completedAt: new Date(),
        duration,
        logs: result.logs,
        errorMessage: result.errorMessage,
      },
    });
  }
}