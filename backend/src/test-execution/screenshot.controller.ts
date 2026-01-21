import { 
  Controller, 
  Get, 
  Param, 
  Res, 
  UseGuards, 
  NotFoundException,
  BadRequestException 
} from '@nestjs/common';
import { Response } from 'express';
import { ScreenshotService } from './screenshot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

@Controller('screenshots')
@UseGuards(JwtAuthGuard)
export class ScreenshotController {
  constructor(
    private readonly screenshotService: ScreenshotService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get(':filename')
  async getScreenshot(
    @Param('filename') filename: string,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    // Validate filename format
    if (!filename.match(/^screenshot-[a-zA-Z0-9-]+\.png$/)) {
      throw new BadRequestException('Invalid screenshot filename format');
    }

    // Extract flowId from filename
    const flowId = filename.split('-')[1];
    
    // Check if user has access to this flow
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
      throw new NotFoundException('Screenshot not found');
    }

    // Check access permissions
    const hasAccess = 
      user.role === 'ADMIN' ||
      flow.project.ownerId === user.id ||
      flow.project.developers.some((dev) => dev.userId === user.id);

    if (!hasAccess) {
      throw new NotFoundException('Screenshot not found');
    }

    try {
      const screenshotBuffer = await this.screenshotService.getScreenshot(filename);
      
      if (!screenshotBuffer) {
        throw new NotFoundException('Screenshot file not found');
      }

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': screenshotBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      });

      res.send(screenshotBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Screenshot not found');
    }
  }
}
