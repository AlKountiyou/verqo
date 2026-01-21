import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TestFlowCategory, TestResultStatus } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TestExecutionGateway } from './test-execution.gateway';
import { ConfigService } from '@nestjs/config';
import { runInDocker } from './docker-runner';

const execAsync = promisify(exec);
type FlowWithProject = {
  id: string;
  name: string;
  category: TestFlowCategory;
  methods: string[];
  project: {
    githubUrl?: string | null;
    stagingUrl?: string | null;
  };
};

export interface TestExecutionResult {
  success: boolean;
  duration: number;
  logs: string;
  errorMessage?: string;
}

@Injectable()
export class TestExecutionService {
  private readonly logger = new Logger(TestExecutionService.name);
  private dockerChecked = false;

  constructor(
    private databaseService: DatabaseService,
    private gateway: TestExecutionGateway,
    private configService: ConfigService,
  ) {}

  async executeTestFlow(
    flowId: string,
    githubAccessToken?: string,
  ): Promise<TestExecutionResult> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const flow: FlowWithProject | null =
      await this.databaseService.testFlow.findUnique({
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
    await this.ensureDockerAvailable();

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
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';

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
    flow: FlowWithProject,
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
      await this.installDependencies(repoPath, logs);

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
        errorMessage:
          error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async executeFrontendTests(
    flow: FlowWithProject,
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
      await this.installDependencies(repoPath, logs);

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
        errorMessage:
          error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async executePerformanceTests(
    flow: FlowWithProject,
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
        errorMessage:
          error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async executeUnitTests(
    flow: FlowWithProject,
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
      await this.installDependencies(repoPath, logs);

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
        errorMessage:
          error instanceof Error ? error.message : 'Erreur inconnue',
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
          await execAsync(`git remote set-url origin ${authUrl}`, {
            cwd: repoPath,
          });
        }
        await execAsync('git pull', { cwd: repoPath });
        if (githubAccessToken) {
          await execAsync(`git remote set-url origin ${githubUrl}`, {
            cwd: repoPath,
          });
        }
      } catch {
        logs.push(`Clonage du repository ${repoName}...`);
        await execAsync(`git clone ${authUrl} ${repoPath}`);
        if (githubAccessToken) {
          await execAsync(`git remote set-url origin ${githubUrl}`, {
            cwd: repoPath,
          });
        }
      }

      return repoPath;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      if (
        message.includes('Authentication failed') ||
        message.includes('Repository not found') ||
        message.toLowerCase().includes('access denied')
      ) {
        throw new Error(
          'Accès refusé au repository GitHub. Vérifiez le token.',
        );
      }
      throw new Error(
        `Erreur lors du clonage/mise à jour du repository: ${message}`,
      );
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
        logs.push("Tentative d'exécution avec npm test...");
        await this.runDockerCommand(repoPath, logs, 'npm test');
        return { success: true };
      } catch (error) {
        logs.push(
          `npm test échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
      }

      // Essayer avec Jest directement
      try {
        logs.push("Tentative d'exécution avec Jest...");
        await this.runDockerCommand(repoPath, logs, 'npx jest');
        return { success: true };
      } catch (error) {
        logs.push(
          `Jest échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
      }

      logs.push('Aucune méthode de test backend trouvée');
      return { success: false };
    } catch (error) {
      logs.push(
        `Erreur lors de l'exécution de la méthode backend: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
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
          await this.runDockerCommand(repoPath, logs, command);
          return { success: true };
        } catch (error) {
          logs.push(
            `${command} échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          );
        }
      }

      logs.push('Aucune méthode de test frontend trouvée');
      return { success: false };
    } catch (error) {
      logs.push(
        `Erreur lors de l'exécution de la méthode frontend: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
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
      if (
        method.toLowerCase().includes('lighthouse') ||
        method.toLowerCase().includes('performance')
      ) {
        logs.push('Exécution des tests Lighthouse...');

        try {
          const stdout = await this.runDockerCommand(
            this.getPerformanceWorkdir(),
            logs,
            `npx lighthouse ${stagingUrl} --output=json --chrome-flags="--headless --no-sandbox"`,
            this.getLighthouseImage(),
          );
          const lighthouseResult = JSON.parse(stdout);

          const performanceScore =
            lighthouseResult.categories.performance.score * 100;
          logs.push(`Score de performance: ${performanceScore}%`);

          // Considérer comme réussi si le score est > 70
          return { success: performanceScore > 70 };
        } catch (error) {
          logs.push(
            `Lighthouse échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          );
        }
      }

      logs.push('Méthode de performance non reconnue');
      return { success: false };
    } catch (error) {
      logs.push(
        `Erreur lors de l'exécution de la méthode de performance: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
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
          await this.runDockerCommand(repoPath, logs, command);
          return { success: true };
        } catch (error) {
          logs.push(
            `${command} échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          );
        }
      }

      logs.push('Aucune méthode de test unitaire trouvée');
      return { success: false };
    } catch (error) {
      logs.push(
        `Erreur lors de l'exécution de la méthode unitaire: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
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

  private async ensureDockerAvailable(): Promise<void> {
    if (this.dockerChecked) return;
    try {
      await execAsync('docker version');
      this.dockerChecked = true;
    } catch {
      throw new Error("Docker est requis pour l'exécution des tests");
    }
  }

  private async installDependencies(
    repoPath: string,
    logs: string[],
  ): Promise<void> {
    const installCommand = await this.getInstallCommand(repoPath);
    logs.push(`Installation des dépendances: ${installCommand}`);
    await this.runDockerCommand(repoPath, logs, installCommand);
  }

  private async getInstallCommand(repoPath: string): Promise<string> {
    const pnpmLock = path.join(repoPath, 'pnpm-lock.yaml');
    const yarnLock = path.join(repoPath, 'yarn.lock');
    const npmLock = path.join(repoPath, 'package-lock.json');

    if (await this.pathExists(pnpmLock)) {
      return 'corepack enable && pnpm install --frozen-lockfile';
    }
    if (await this.pathExists(yarnLock)) {
      return 'corepack enable && yarn install --frozen-lockfile';
    }
    if (await this.pathExists(npmLock)) {
      return 'npm ci';
    }
    return 'npm install';
  }

  private async pathExists(target: string): Promise<boolean> {
    try {
      await fs.access(target);
      return true;
    } catch {
      return false;
    }
  }

  private getTestImage(): string {
    return (
      this.configService.get<string>('TEST_RUNNER_IMAGE') || 'node:20-bullseye'
    );
  }

  private getLighthouseImage(): string {
    return (
      this.configService.get<string>('LIGHTHOUSE_RUNNER_IMAGE') ||
      'ghcr.io/puppeteer/puppeteer:latest'
    );
  }

  private getPerformanceWorkdir(): string {
    return (
      this.configService.get<string>('PERFORMANCE_TMP_DIR') || process.cwd()
    );
  }

  private async runDockerCommand(
    repoPath: string,
    logs: string[],
    command: string,
    image?: string,
  ): Promise<string> {
    const runnerImage = image || this.getTestImage();
    logs.push(`Docker: ${runnerImage} -> ${command}`);
    return runInDocker({
      image: runnerImage,
      workdir: repoPath,
      command,
      logs,
    });
  }
}
