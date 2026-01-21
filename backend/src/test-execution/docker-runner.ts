import { Logger } from '@nestjs/common';
import { spawn } from 'child_process';

export interface DockerRunOptions {
  image: string;
  workdir: string;
  command: string;
  logs: string[];
}

export const runInDocker = ({
  image,
  workdir,
  command,
  logs,
}: DockerRunOptions): Promise<string> => {
  const logger = new Logger('DockerRunner');
  const stdoutChunks: string[] = [];

  return new Promise((resolve, reject) => {
    const args = [
      'run',
      '--rm',
      '-v',
      `${workdir}:/workspace`,
      '-w',
      '/workspace',
      image,
      'bash',
      '-lc',
      command,
    ];

    const child = spawn('docker', args, { shell: false });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdoutChunks.push(text);
      logs.push(text.trim());
    });

    child.stderr.on('data', (data) => {
      logs.push(`STDERR: ${data.toString().trim()}`);
    });

    child.on('error', (error) => {
      logger.error(`Docker run failed: ${error.message}`);
      reject(new Error(`Docker run failed: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(`Docker run exited with code ${code}`),
        );
      } else {
        resolve(stdoutChunks.join(''));
      }
    });
  });
};
