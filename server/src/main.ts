import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap () {
  const app = await NestFactory.create( AppModule );
  app.useGlobalPipes(
    new ValidationPipe( {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    } ),
  );

  // API docs (like .NET Swagger): UI at /docs, JSON at /docs-json
  const config = new DocumentBuilder()
    .setTitle( 'Pet Grooming API' )
    .setDescription( 'Booking, pets, services, staff, and settings API' )
    .setVersion( '1.0' )
    .addBearerAuth()
    .build();

  const createDocument = () => SwaggerModule.createDocument( app, config );
  SwaggerModule.setup( 'docs', app, createDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      filter: true,
      showRequestDuration: true,
      operationsSorter: 'alpha',
      tagsSorter: 'alpha',
    },
  } );

  await app.listen( process.env.PORT ?? 4000 );
}
void bootstrap();
