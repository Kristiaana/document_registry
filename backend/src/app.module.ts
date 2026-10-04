import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './documents/document.entity';
import { DocumentsModule } from './documents/documents.module';
import { ImportModule } from './import/import.module';
import { MockSourceController } from './mock-source/mock-source.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 5432)),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'document_registry'),
        entities: [DocumentEntity],
        // MVP: shēmu veido TypeORM. Produkcijā - migrācijas.
        synchronize: config.get('DB_SYNCHRONIZE', 'true') === 'true',
      }),
    }),
    DocumentsModule,
    ImportModule,
  ],
  controllers: [MockSourceController],
})
export class AppModule {}
