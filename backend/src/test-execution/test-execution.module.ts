import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TestExecutionService } from './test-execution.service';
import { TestRunnerService } from './test-runner.service';
import { TestQueueService } from './test-queue.service';
import { TestSchedulerService } from './test-scheduler.service';
import { TestConfigService } from './test-config.service';
import { ScreenshotService } from './screenshot.service';
import { TestExecutionController } from './test-execution.controller';
import { ScreenshotController } from './screenshot.controller';
import { DatabaseModule } from '../database/database.module';
import { TestExecutionGateway } from './test-execution.gateway';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [TestExecutionController, ScreenshotController],
  providers: [
    TestExecutionService,
    TestRunnerService,
    TestQueueService,
    TestSchedulerService,
    TestConfigService,
    ScreenshotService,
    TestExecutionGateway,
  ],
  exports: [
    TestExecutionService,
    TestRunnerService,
    TestQueueService,
    TestSchedulerService,
    TestConfigService,
    ScreenshotService,
  ],
})
export class TestExecutionModule {}
