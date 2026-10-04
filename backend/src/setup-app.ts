import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';

/** Kopīga konfigurācija main.ts un e2e testiem. */
export function setupApp(app: INestApplication, corsOrigin = 'http://localhost:3000'): void {
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'mock/documents.xml', method: RequestMethod.GET },
      { path: 'mock/files/:fileName', method: RequestMethod.GET },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  app.enableCors({ origin: corsOrigin.split(',') });
}
