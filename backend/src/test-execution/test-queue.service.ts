import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { TestRunnerService } from './test-runner.service';

export interface TestJobData {
  flowId: string;
  userId: string;
  projectId: string;
}

@Injectable()
export class TestQueueService {
  private readonly logger = new Logger(TestQueueService.name);
  private queue: Queue<TestJobData>;
  private worker: Worker<TestJobData>;
  private connection: IORedis;

  constructor(private readonly testRunnerService: TestRunnerService) {
    // Redis connection
    this.connection = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null, // Required by BullMQ
    });

    // Create queue
    this.queue = new Queue<TestJobData>('test-execution', {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 5,      // Keep last 5 failed jobs
        attempts: 3,          // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Create worker
    this.worker = new Worker<TestJobData>(
      'test-execution',
      this.processTestJob.bind(this),
      {
        connection: this.connection,
        concurrency: 3, // Process up to 3 tests concurrently
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job: Job<TestJobData>) => {
      this.logger.log(`Test job completed for flow ${job.data.flowId}`);
    });

    this.worker.on('failed', (job: Job<TestJobData> | undefined, err: Error) => {
      this.logger.error(`Test job failed: ${err.message}`, err.stack);
    });

    this.worker.on('error', (err: Error) => {
      this.logger.error(`Worker error: ${err.message}`, err.stack);
    });

    this.queue.on('error', (err: Error) => {
      this.logger.error(`Queue error: ${err.message}`, err.stack);
    });
  }

  private async processTestJob(job: Job<TestJobData>): Promise<void> {
    const { flowId, userId, projectId } = job.data;
    
    this.logger.log(`Processing test job for flow ${flowId}`);
    
    try {
      await this.testRunnerService.executeTestFlow(flowId, userId);
      this.logger.log(`Test execution completed for flow ${flowId}`);
    } catch (error) {
      this.logger.error(`Test execution failed for flow ${flowId}: ${error.message}`);
      throw error; // Re-throw to mark job as failed
    }
  }

  async addTestJob(data: TestJobData): Promise<Job<TestJobData>> {
    this.logger.log(`Adding test job for flow ${data.flowId}`);
    
    const job = await this.queue.add('execute-test', data, {
      jobId: `test-${data.flowId}-${Date.now()}`, // Unique job ID
    });

    return job;
  }

  async getJobStatus(jobId: string): Promise<Job<TestJobData> | undefined> {
    return await this.queue.getJob(jobId);
  }

  async getQueueStats() {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.queue.close();
    await this.connection.quit();
  }
}
