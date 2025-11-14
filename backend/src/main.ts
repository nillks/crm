import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const corsOrigins = corsOrigin.split(',').map(origin => origin.trim());
  
  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  const port = parseInt(process.env.PORT || '3000', 10);
  console.log(`🔧 Starting server on port ${port}...`);
  console.log(`🔍 PORT env var: ${process.env.PORT || 'not set (using default 3000)'}`);
  
  try {
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Backend is running on: http://0.0.0.0:${port}/api`);
    console.log(`📡 Server listening on port ${port}`);
    process.stdout.write(`✅ Server started successfully on port ${port}\n`);
  } catch (error) {
    console.error(`❌ Error starting server:`, error);
    throw error;
  }
}
bootstrap();
