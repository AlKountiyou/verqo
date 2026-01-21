import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ScreenshotService {
  private readonly logger = new Logger(ScreenshotService.name);
  private readonly screenshotsPath: string;

  constructor() {
    this.screenshotsPath = path.join(process.cwd(), 'screenshots');
    this.ensureScreenshotsDirectory();
  }

  private async ensureScreenshotsDirectory() {
    try {
      await fs.mkdir(this.screenshotsPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create screenshots directory: ${error.message}`);
    }
  }

  async saveScreenshot(
    flowId: string,
    method: string,
    screenshotBuffer: Buffer,
  ): Promise<string> {
    const timestamp = Date.now();
    const filename = `screenshot-${flowId}-${method.replace(/\s+/g, '-')}-${timestamp}.png`;
    const filepath = path.join(this.screenshotsPath, filename);

    try {
      await fs.writeFile(filepath, screenshotBuffer);
      this.logger.log(`Screenshot saved: ${filename}`);
      return `/screenshots/${filename}`;
    } catch (error) {
      this.logger.error(`Failed to save screenshot: ${error.message}`);
      throw error;
    }
  }

  async getScreenshot(filename: string): Promise<Buffer | null> {
    const filepath = path.join(this.screenshotsPath, filename);
    
    try {
      return await fs.readFile(filepath);
    } catch (error) {
      this.logger.error(`Failed to read screenshot: ${error.message}`);
      return null;
    }
  }

  async deleteScreenshot(filename: string): Promise<boolean> {
    const filepath = path.join(this.screenshotsPath, filename);
    
    try {
      await fs.unlink(filepath);
      this.logger.log(`Screenshot deleted: ${filename}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete screenshot: ${error.message}`);
      return false;
    }
  }

  async cleanupOldScreenshots(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let deletedCount = 0;
    
    try {
      const files = await fs.readdir(this.screenshotsPath);
      
      for (const file of files) {
        const filepath = path.join(this.screenshotsPath, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }
      
      this.logger.log(`Cleaned up ${deletedCount} old screenshots`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup screenshots: ${error.message}`);
      return 0;
    }
  }
}
