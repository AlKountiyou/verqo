import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TestFlowCategory, TestFlowStatus, TestResultStatus } from '@prisma/client';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { chromium } from 'playwright';
import autocannon from 'autocannon';
import { TestExecutionGateway } from './test-execution.gateway';

export interface TestExecutionResult {
  status: TestResultStatus;
  logs: string[];
  screenshotUrls: string[];
  errorMessage?: string;
  duration: number;
}

@Injectable()
export class TestRunnerService {
  private readonly logger = new Logger(TestRunnerService.name);
  private readonly REPO_BASE_PATH = path.join(process.cwd(), 'temp_repos');
  private readonly SCREENSHOTS_PATH = path.join(process.cwd(), 'screenshots');

  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: TestExecutionGateway,
  ) {
    // Ensure directories exist
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    await fs.mkdir(this.REPO_BASE_PATH, { recursive: true });
    await fs.mkdir(this.SCREENSHOTS_PATH, { recursive: true });
  }

  async executeTestFlow(flowId: string, userId?: string): Promise<TestExecutionResult> {
    const flow = await this.db.testFlow.findUnique({
      where: { id: flowId },
      include: { project: true },
    });

    if (!flow) {
      throw new NotFoundException(`Test Flow with ID ${flowId} not found`);
    }

    if (!flow.project) {
      throw new NotFoundException(`Project for Test Flow with ID ${flowId} not found`);
    }

    const githubAccessToken = userId
      ? (
          await this.db.user.findUnique({
            where: { id: userId },
            select: { githubAccessToken: true },
          })
        )?.githubAccessToken
      : undefined;

    // Update flow status to RUNNING
    await this.db.testFlow.update({
      where: { id: flowId },
      data: { status: TestFlowStatus.RUNNING, lastRun: new Date() },
    });
    this.gateway.emitFlowStatus({
      flowId,
      status: TestFlowStatus.RUNNING,
      lastRun: new Date(),
    });

    const startTime = Date.now();
    let result: TestExecutionResult;

    try {
      this.logger.log(`Starting test execution for flow: ${flow.name} (${flow.category})`);

      switch (flow.category) {
        case TestFlowCategory.BACKEND:
          result = await this.executeBackendTest(flow, githubAccessToken);
          break;
        case TestFlowCategory.FRONTEND:
          result = await this.executeFrontendTest(flow);
          break;
        case TestFlowCategory.PERFORMANCE:
          result = await this.executePerformanceTest(flow);
          break;
        case TestFlowCategory.UNIT:
          result = await this.executeUnitTest(flow, githubAccessToken);
          break;
        default:
          throw new BadRequestException(`Unsupported test category: ${flow.category}`);
      }
    } catch (error: any) {
      this.logger.error(`Test execution failed for flow ${flowId}: ${error.message}`);
      result = {
        status: TestResultStatus.FAILED,
        logs: [`Error: ${error.message}`],
        screenshotUrls: [],
        errorMessage: error.message,
        duration: Date.now() - startTime,
      };
    }

    // Record test result
    const savedResult = await this.recordTestResult(flowId, result);

    // Update flow status
    await this.db.testFlow.update({
      where: { id: flowId },
      data: {
        status: result.status === TestResultStatus.SUCCESS ? TestFlowStatus.SUCCESS : TestFlowStatus.FAILED,
        duration: result.duration,
      },
    });
    this.gateway.emitFlowStatus({
      flowId,
      status: result.status === TestResultStatus.SUCCESS ? TestFlowStatus.SUCCESS : TestFlowStatus.FAILED,
      duration: result.duration,
      resultId: savedResult.id,
    });

    return result;
  }

  private async executeBackendTest(flow: any, githubAccessToken?: string): Promise<TestExecutionResult> {
    const logs: string[] = [];
    const screenshotUrls: string[] = [];
    const startTime = Date.now();

    logs.push(`Starting backend test for flow: ${flow.name}`);

    const project = flow.project;
    if (!project.githubUrl) {
      throw new BadRequestException('Le projet doit avoir une URL GitHub configurée pour exécuter les tests backend');
    }

    const repoPath = await this.cloneOrUpdateRepo(project.githubUrl, logs, githubAccessToken);

    for (const method of flow.methods) {
      logs.push(`Executing backend method: ${method}`);
      try {
        const methodResult = await this.runBackendMethod(repoPath, method, logs);
        if (methodResult.status === TestResultStatus.FAILED) {
          return {
            status: TestResultStatus.FAILED,
            logs,
            screenshotUrls,
            errorMessage: methodResult.errorMessage,
            duration: Date.now() - startTime,
          };
        }
      } catch (error: any) {
        return {
          status: TestResultStatus.FAILED,
          logs,
          screenshotUrls,
          errorMessage: error.message,
          duration: Date.now() - startTime,
        };
      }
    }

    return {
      status: TestResultStatus.SUCCESS,
      logs,
      screenshotUrls,
      duration: Date.now() - startTime,
    };
  }

  private async executeFrontendTest(flow: any): Promise<TestExecutionResult> {
    const logs: string[] = [];
    const screenshotUrls: string[] = [];
    const startTime = Date.now();

    logs.push(`Starting frontend test for flow: ${flow.name}`);

    const project = flow.project;
    if (!project.stagingUrl) {
      throw new BadRequestException('Le projet doit avoir une URL de staging configurée pour exécuter les tests frontend');
    }

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      for (const method of flow.methods) {
        logs.push(`Executing frontend method: ${method}`);
        
        const screenshotPath = await this.takeScreenshot(page, flow.id, method);
        screenshotUrls.push(screenshotPath);

        const methodResult = await this.runFrontendMethod(page, method, logs);
        if (methodResult.status === TestResultStatus.FAILED) {
          return {
            status: TestResultStatus.FAILED,
            logs,
            screenshotUrls,
            errorMessage: methodResult.errorMessage,
            duration: Date.now() - startTime,
          };
        }
      }

      return {
        status: TestResultStatus.SUCCESS,
        logs,
        screenshotUrls,
        duration: Date.now() - startTime,
      };
    } finally {
      await browser.close();
    }
  }

  private async executePerformanceTest(flow: any): Promise<TestExecutionResult> {
    const logs: string[] = [];
    const screenshotUrls: string[] = [];
    const startTime = Date.now();

    logs.push(`Starting performance test for flow: ${flow.name}`);

    const project = flow.project;
    if (!project.stagingUrl) {
      throw new BadRequestException('Le projet doit avoir une URL de staging configurée pour exécuter les tests de performance');
    }

    for (const method of flow.methods) {
      logs.push(`Executing performance method: ${method}`);
      try {
        const methodResult = await this.runPerformanceMethod(project.stagingUrl, method, logs);
        if (methodResult.status === TestResultStatus.FAILED) {
          return {
            status: TestResultStatus.FAILED,
            logs,
            screenshotUrls,
            errorMessage: methodResult.errorMessage,
            duration: Date.now() - startTime,
          };
        }
      } catch (error: any) {
        return {
          status: TestResultStatus.FAILED,
          logs,
          screenshotUrls,
          errorMessage: error.message,
          duration: Date.now() - startTime,
        };
      }
    }

    return {
      status: TestResultStatus.SUCCESS,
      logs,
      screenshotUrls,
      duration: Date.now() - startTime,
    };
  }

  private async executeUnitTest(flow: any, githubAccessToken?: string): Promise<TestExecutionResult> {
    const logs: string[] = [];
    const screenshotUrls: string[] = [];
    const startTime = Date.now();

    logs.push(`Starting unit test for flow: ${flow.name}`);

    const project = flow.project;
    if (!project.githubUrl) {
      throw new BadRequestException('Le projet doit avoir une URL GitHub configurée pour exécuter les tests unitaires');
    }

    const repoPath = await this.cloneOrUpdateRepo(project.githubUrl, logs, githubAccessToken);

    for (const method of flow.methods) {
      logs.push(`Executing unit method: ${method}`);
      try {
        const methodResult = await this.runUnitMethod(repoPath, method, logs);
        if (methodResult.status === TestResultStatus.FAILED) {
          return {
            status: TestResultStatus.FAILED,
            logs,
            screenshotUrls,
            errorMessage: methodResult.errorMessage,
            duration: Date.now() - startTime,
          };
        }
      } catch (error: any) {
        return {
          status: TestResultStatus.FAILED,
          logs,
          screenshotUrls,
          errorMessage: error.message,
          duration: Date.now() - startTime,
        };
      }
    }

    return {
      status: TestResultStatus.SUCCESS,
      logs,
      screenshotUrls,
      duration: Date.now() - startTime,
    };
  }

  private async cloneOrUpdateRepo(
    githubUrl: string,
    logs: string[],
    githubAccessToken?: string,
  ): Promise<string> {
    const repoName = githubUrl.split('/').pop()?.replace('.git', '');
    if (!repoName) {
      throw new BadRequestException('Invalid GitHub URL');
    }
    const repoPath = path.join(this.REPO_BASE_PATH, repoName);
    const authUrl = githubAccessToken
      ? this.buildAuthenticatedUrl(githubUrl, githubAccessToken)
      : githubUrl;

    try {
      if (await fs.stat(repoPath).catch(() => null)) {
        logs.push(`Updating repository: ${repoName}`);
        if (githubAccessToken) {
          await this.executeCommand('git', ['remote', 'set-url', 'origin', authUrl], repoPath, logs);
        }
        await this.executeCommand('git', ['pull'], repoPath, logs);
        if (githubAccessToken) {
          await this.executeCommand('git', ['remote', 'set-url', 'origin', githubUrl], repoPath, logs);
        }
      } else {
        logs.push(`Cloning repository: ${repoName}`);
        await fs.mkdir(repoPath, { recursive: true });
        await this.executeCommand('git', ['clone', authUrl, repoPath], process.cwd(), logs);
        if (githubAccessToken) {
          await this.executeCommand('git', ['remote', 'set-url', 'origin', githubUrl], repoPath, logs);
        }
      }
    } catch (error: any) {
      logs.push(`Git operation failed: ${error.message}`);
      if (
        error.message.includes('Authentication failed') ||
        error.message.includes('Repository not found') ||
        error.message.toLowerCase().includes('access denied')
      ) {
        throw new Error('Accès refusé au repository GitHub. Vérifiez le token.');
      }
      throw error;
    }

    return repoPath;
  }

  private buildAuthenticatedUrl(githubUrl: string, token: string): string {
    return githubUrl.replace(
      'https://github.com/',
      `https://x-access-token:${token}@github.com/`,
    );
  }

  private async runBackendMethod(repoPath: string, method: string, logs: string[]): Promise<{ status: TestResultStatus; errorMessage?: string }> {
    logs.push(`Attempting to run backend method: ${method}`);
    
    try {
      // Try to run npm test with specific test pattern
      await this.executeCommand('npm', ['test', '--', '--grep', method], repoPath, logs);
      logs.push(`Backend method "${method}" executed successfully`);
      return { status: TestResultStatus.SUCCESS };
    } catch (error: any) {
      logs.push(`Backend method "${method}" failed: ${error.message}`);
      return { status: TestResultStatus.FAILED, errorMessage: error.message };
    }
  }

  private async runFrontendMethod(page: any, method: string, logs: string[]): Promise<{ status: TestResultStatus; errorMessage?: string }> {
    logs.push(`Attempting to run frontend method: ${method}`);
    
    try {
      // Simple frontend test scenarios
      if (method.includes('navigate')) {
        const url = method.split(' ')[1] || 'http://localhost:3000';
        await page.goto(url);
        logs.push(`Navigated to ${url}`);
      } else if (method.includes('click')) {
        const selector = method.split(' ')[1] || 'button';
        await page.click(selector);
        logs.push(`Clicked element: ${selector}`);
      } else if (method.includes('check')) {
        const selector = method.split(' ')[1] || 'h1';
        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }
        logs.push(`Element found: ${selector}`);
      }
      
      logs.push(`Frontend method "${method}" executed successfully`);
      return { status: TestResultStatus.SUCCESS };
    } catch (error: any) {
      logs.push(`Frontend method "${method}" failed: ${error.message}`);
      return { status: TestResultStatus.FAILED, errorMessage: error.message };
    }
  }

  private async runPerformanceMethod(stagingUrl: string, method: string, logs: string[]): Promise<{ status: TestResultStatus; errorMessage?: string }> {
    logs.push(`Attempting to run performance method: ${method} on ${stagingUrl}`);
    
    try {
      const result = await autocannon({
        url: stagingUrl,
        connections: 10,
        duration: 10,
      });
      
      logs.push(`Performance test completed: ${result.requests.average} req/sec`);
      logs.push(`Latency: ${result.latency.average}ms`);
      
      return { status: TestResultStatus.SUCCESS };
    } catch (error: any) {
      logs.push(`Performance method "${method}" failed: ${error.message}`);
      return { status: TestResultStatus.FAILED, errorMessage: error.message };
    }
  }

  private async runUnitMethod(repoPath: string, method: string, logs: string[]): Promise<{ status: TestResultStatus; errorMessage?: string }> {
    logs.push(`Attempting to run unit method: ${method}`);
    
    try {
      // Try to run specific unit test
      await this.executeCommand('npm', ['test', '--', '--grep', method], repoPath, logs);
      logs.push(`Unit method "${method}" executed successfully`);
      return { status: TestResultStatus.SUCCESS };
    } catch (error: any) {
      logs.push(`Unit method "${method}" failed: ${error.message}`);
      return { status: TestResultStatus.FAILED, errorMessage: error.message };
    }
  }

  private async takeScreenshot(page: any, flowId: string, method: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `screenshot-${flowId}-${method.replace(/\s+/g, '-')}-${timestamp}.png`;
    const filepath = path.join(this.SCREENSHOTS_PATH, filename);
    
    await page.screenshot({ path: filepath, fullPage: true });
    
    return `/screenshots/${filename}`;
  }

  private async executeCommand(
    command: string,
    args: string[],
    cwd: string,
    logs: string[],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, shell: true });

      child.stdout.on('data', (data) => {
        logs.push(data.toString().trim());
      });

      child.stderr.on('data', (data) => {
        logs.push(`STDERR: ${data.toString().trim()}`);
      });

      child.on('error', (error) => {
        logs.push(`Failed to start command: ${error.message}`);
        reject(new Error(`Failed to start command: ${error.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          logs.push(`Command exited with code ${code}`);
          reject(new Error(`Command "${command} ${args.join(' ')}" exited with code ${code}`));
        } else {
          logs.push(`Command exited successfully with code ${code}`);
          resolve();
        }
      });
    });
  }

  private async recordTestResult(
    flowId: string,
    result: TestExecutionResult,
  ) {
    return this.db.testResult.create({
      data: {
        flowId,
        status: result.status,
        startedAt: new Date(Date.now() - result.duration),
        endedAt: new Date(),
        completedAt: new Date(), // For backward compatibility
        duration: result.duration,
        logs: JSON.stringify(result.logs),
        errorMessage: result.errorMessage,
        screenshotUrls: result.screenshotUrls,
      },
    });
  }
}
