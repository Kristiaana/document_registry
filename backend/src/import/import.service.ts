import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DocumentEntity } from '../documents/document.entity';
import { parseDocumentsXml, type ParseIssue } from './xml-document.parser';
import { XmlSourceClient } from './xml-source.client';

export interface ImportResult {
  source: string;
  received: number;
  created: number;
  updated: number;
  skipped: number;
  issues: ParseIssue[];
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly source: XmlSourceClient,
    @InjectRepository(DocumentEntity)
    private readonly documents: Repository<DocumentEntity>,
  ) {}

  async importFromSource(sourceUrl = this.source.sourceUrl): Promise<ImportResult> {
    const xml = await this.source.fetchXml(sourceUrl);
    const { records, issues } = parseDocumentsXml(xml);

    for (const issue of issues) {
      this.logger.warn(
        `Izlaists ieraksts #${issue.index} (${issue.externalId ?? 'bez id'}): ${issue.errors.join('; ')}`,
      );
    }

    let created = 0;
    if (records.length > 0) {
      created = await this.documents.manager.transaction(async (em) => {
        const repo = em.getRepository(DocumentEntity);
        const ids = records.map((r) => r.externalId);
        const existing = await repo.count({ where: { externalId: In(ids) } });
        // Upsert pēc externalId: atkārtots imports atjaunina, nevis dublē ierakstus.
        await repo.upsert(records, { conflictPaths: ['externalId'] });
        return records.length - existing;
      });
    }

    const result: ImportResult = {
      source: sourceUrl,
      received: records.length + issues.length,
      created,
      updated: records.length - created,
      skipped: issues.length,
      issues,
    };
    this.logger.log(
      `Imports no ${sourceUrl}: saņemti ${result.received}, jauni ${result.created}, atjaunināti ${result.updated}, izlaisti ${result.skipped}`,
    );
    return result;
  }
}
