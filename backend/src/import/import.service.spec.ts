import type { Repository } from 'typeorm';
import { DocumentEntity } from '../documents/document.entity';
import { documentsToXml, generateDocuments } from '../test-data/document-generator';
import { ImportService } from './import.service';
import { XmlFormatError } from './xml-document.parser';
import type { XmlSourceClient } from './xml-source.client';

describe('ImportService', () => {
  const records = generateDocuments({ count: 3, seed: 1, until: new Date('2026-01-01') });

  function setup(xml: string, existingCount = 0) {
    const repo = {
      count: jest.fn().mockResolvedValue(existingCount),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    const documents = {
      manager: { transaction: jest.fn((cb) => cb({ getRepository: () => repo })) },
    } as unknown as Repository<DocumentEntity>;
    const source = {
      sourceUrl: 'http://remote/documents.xml',
      fetchXml: jest.fn().mockResolvedValue(xml),
    } as unknown as XmlSourceClient;

    return { service: new ImportService(source, documents), repo, source };
  }

  it('ielādē XML no avota un veic upsert pēc externalId', async () => {
    const { service, repo, source } = setup(documentsToXml(records), 1);

    const result = await service.importFromSource();

    expect(source.fetchXml).toHaveBeenCalledWith('http://remote/documents.xml');
    expect(repo.upsert).toHaveBeenCalledWith(records, { conflictPaths: ['externalId'] });
    expect(result).toMatchObject({ received: 3, created: 2, updated: 1, skipped: 0 });
  });

  it('nekorektos ierakstus izlaiž un atskaitās par tiem', async () => {
    const xml = documentsToXml(records).replace('<importance>', '<importance>x');
    const { service, repo } = setup(xml);

    const result = await service.importFromSource();

    expect(result.skipped).toBe(1);
    expect(result.issues[0].externalId).toBe('DOC-0001');
    expect(repo.upsert.mock.calls[0][0]).toHaveLength(2);
  });

  it('tukšs avots neko neraksta datubāzē', async () => {
    const { service, repo } = setup('<documents/>');

    await expect(service.importFromSource()).resolves.toMatchObject({ received: 0 });
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('bojāts XML -> XmlFormatError, datubāze netiek aiztikta', async () => {
    const { service, repo } = setup('<documents>');

    await expect(service.importFromSource()).rejects.toBeInstanceOf(XmlFormatError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });
});
