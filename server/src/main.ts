import 'dotenv/config';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap () {
  const app = await NestFactory.create<NestExpressApplication>( AppModule );

  // Uploaded pet photos (pets photo endpoint) — served as-is, no auth: the
  // URLs are unguessable only by pet id, and photos are not sensitive data
  app.useStaticAssets( join( process.cwd(), 'uploads' ), { prefix: '/uploads/' } );
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


  await app.listen( process.env.PORT ?? 4000, () => {
    setInterval( () => {
      const memory = process.memoryUsage();
      console.log( `%cHeap Used: ${ ( memory.heapUsed / 1024 / 1024 ).toFixed( 2 ) } MB`, 'color: #4CAF50; font-weight: bold;' );
    }, 5000 );
  } );
}
void bootstrap();
