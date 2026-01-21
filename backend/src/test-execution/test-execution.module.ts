import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TestExecutionService } from './test-execution.service';
import { TestSchedulerService } from './test-scheduler.service';
import { TestConfigService } from './test-config.service';
import { ScreenshotService } from './screenshot.service';
import { TestExecutionController } from './test-execution.controller';
import { ScreenshotController } from './screenshot.controller';
import { DatabaseModule } from '../database/database.module';
import { TestExecutionGateway } from './test-execution.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule, ScheduleModule.forRoot()],
  controllers: [TestExecutionController, ScreenshotController],
  providers: [
    TestExecutionService,
    TestSchedulerService,
    TestConfigService,
    ScreenshotService,
    TestExecutionGateway,
  ],
  exports: [
    TestExecutionService,
    TestSchedulerService,
    TestConfigService,
    ScreenshotService,
  ],
})
export class TestExecutionModule {}
