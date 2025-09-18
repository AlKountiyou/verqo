import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Configuration CORS pour permettre les appels depuis le frontend
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000'], // Frontend URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = process.env.PORT || 3000; // Port 3000 par défaut pour correspondre au frontend
  await app.listen(port);
  console.log(`🚀 Backend Verqo running on http://localhost:${port}`);
}
bootstrap();
