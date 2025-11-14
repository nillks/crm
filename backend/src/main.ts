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
  
  // Initialize the application to ensure all routes are mapped
  await app.init();
  console.log('✅ Application initialized, all routes mapped');
  
  // Render автоматически устанавливает PORT для web-сервисов
  // Если PORT не установлен, используем 10000 (порт, который ожидает Render)
  const port = parseInt(process.env.PORT || '10000', 10);
  console.log(`🔧 Starting server on port ${port}...`);
  console.log(`🔍 PORT env var: ${process.env.PORT || 'not set (using default 10000)'}`);
  
  try {
    console.log('⏳ Calling app.listen()...');
    const server = await app.listen(port, '0.0.0.0');
    console.log('✅ app.listen() resolved');
    
    const address = server.address();
    let url: string;
    if (typeof address === 'string') {
      url = address;
    } else if (address) {
      const host = address.address === '::' ? '0.0.0.0' : address.address;
      url = `http://${host}:${address.port}`;
    } else {
      url = `http://0.0.0.0:${port}`;
    }
    console.log(`🚀 Backend is running on: ${url}/api`);
    console.log(`📡 Server listening on port ${port}`);
    console.log(`✅ Server address: ${JSON.stringify(address)}`);
    console.log(`✅ Server URL: ${url}`);
    process.stdout.write(`✅ Server started successfully on port ${port}\n`);
  } catch (error) {
    console.error(`❌ Error starting server:`, error);
    throw error;
  }
}
bootstrap();
