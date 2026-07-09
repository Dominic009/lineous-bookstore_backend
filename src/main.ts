/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Add global /api prefix
  app.setGlobalPrefix('api');

  // Custom body parser that skips multipart requests (let multer handle them)
  app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    const contentLength = req.headers['content-length'] || 'unknown';
    console.log(
      `[DEBUG] ${req.method} ${req.url} Content-Type: ${contentType} Content-Length: ${contentLength}`,
    );
    // Parse JSON and URL-encoded bodies
    bodyParser.json({ limit: '10mb' })(req, res, (err) => {
      if (err) {
        console.log(`[DEBUG] JSON parse error:`, err.message);
        return next(err);
      }
      bodyParser.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
    });
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      forbidNonWhitelisted: true,
    }),
  );

  // Configure CORS for production
  const corsOptions = {
    origin: process.env.CORS_ORIGIN?.split(',') || true, // Configure in production
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
  app.enableCors(corsOptions);

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
