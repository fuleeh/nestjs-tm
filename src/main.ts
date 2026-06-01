import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './transform.interceptor';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger();
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new TransformInterceptor());
  const configService = app.get(ConfigService);
  const port = Number(configService.get('PORT'));
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
