import { Module } from '@nestjs/common';
import { TestFlowService } from './test-flow.service';
import { TestFlowController } from './test-flow.controller';
import { DatabaseModule } from '../database/database.module';
import { ProjectModule } from '../project/project.module';
import { TestExecutionModule } from '../test-execution/test-execution.module';

@Module({
  imports: [DatabaseModule, ProjectModule, TestExecutionModule],
  controllers: [TestFlowController],
  providers: [TestFlowService],
})
export class TestFlowModule {}
