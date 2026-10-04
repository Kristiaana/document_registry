import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '../documents/document.entity';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { XmlSourceClient } from './xml-source.client';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity])],
  controllers: [ImportController],
  providers: [ImportService, XmlSourceClient],
  exports: [ImportService],
})
export class ImportModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(ImportModule.name);

  constructor(
    private readonly importService: ImportService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get('IMPORT_ON_STARTUP', 'true') !== 'true') return;
    // Nebloķējam palaišanu: noklusējuma avots ir šī paša servera gala punkts,
    // kas sāk atbildēt tikai pēc app.listen().
    setTimeout(() => {
      this.importService
        .importFromSource()
        .catch((err: Error) => this.logger.error(`Imports pie palaišanas neizdevās: ${err.message}`));
    }, 500);
  }
}
