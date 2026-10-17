import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { CreateTransferValidationPipe } from './libs/pipes/create-transfer-validation.pipe.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new CreateTransferValidationPipe());
  app.enableShutdownHooks();

  try {
    await app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
  } catch (error) {
    await app.close();
    throw error;
  }
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
