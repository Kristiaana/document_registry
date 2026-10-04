/**
 * E2E: XML avots -> imports -> PostgreSQL -> REST API.
 * Vajadzīga strādājoša PostgreSQL ar atsevišķu testa datubāzi (noklusējums: document_registry_test).
 * Tabula tiek iztīrīta pirms testiem.
 */
import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { documentsToXml, generateDocuments } from '../src/test-data/document-generator';

describe('Documents API (e2e)', () => {
  let app: INestApplication;
  const records = generateDocuments({ count: 25, seed: 99, until: new Date('2026-01-01') });

  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'docreg-'));
    const file = join(dir, 'documents.xml');
    writeFileSync(file, documentsToXml(records));

    process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'document_registry_test';
    process.env.XML_SOURCE_URL = pathToFileURL(file).href;
    process.env.IMPORT_ON_STARTUP = 'false';
    Logger.overrideLogger(['error']);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    await app.get(DataSource).query('TRUNCATE documents RESTART IDENTITY');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /api/import ielādē dokumentus; atkārtots imports neveido dublikātus', async () => {
    const first = await request(app.getHttpServer()).post('/api/import').expect(200);
    expect(first.body).toMatchObject({ received: 25, created: 25, updated: 0, skipped: 0 });

    const second = await request(app.getHttpServer()).post('/api/import').expect(200);
    expect(second.body).toMatchObject({ created: 0, updated: 25 });

    const list = await request(app.getHttpServer()).get('/api/documents').expect(200);
    expect(list.body.total).toBe(25);
  });

  it('GET /api/documents lapo rezultātus', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/documents?limit=10&page=3')
      .expect(200);
    expect(res.body).toMatchObject({ total: 25, page: 3, limit: 10 });
    expect(res.body.items).toHaveLength(5);
  });

  it('filtrē pēc svarīguma un aktīvā statusa', async () => {
    const expected = records.filter(
      (r) => ['high', 'critical'].includes(r.importance) && r.active,
    ).length;

    const res = await request(app.getHttpServer())
      .get('/api/documents?importance=high,critical&active=true&limit=100')
      .expect(200);

    expect(res.body.total).toBe(expected);
    for (const d of res.body.items) {
      expect(['high', 'critical']).toContain(d.importance);
      expect(d.active).toBe(true);
    }
  });

  it('meklē nosaukumā (reģistrnejutīgi)', async () => {
    const word = records[0].title.split(' ')[0];
    const expected = records.filter(
      (r) =>
        r.title.toLowerCase().includes(word.toLowerCase()) ||
        r.description.toLowerCase().includes(word.toLowerCase()),
    ).length;

    const res = await request(app.getHttpServer())
      .get('/api/documents')
      .query({ search: word.toUpperCase(), limit: 100 })
      .expect(200);
    expect(res.body.total).toBe(expected);
  });

  it('šķiro pēc lasīšanas laika augošā secībā', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/documents?sortBy=readingTimeMinutes&sortOrder=asc&limit=100')
      .expect(200);
    const times = res.body.items.map((d: { readingTimeMinutes: number }) => d.readingTimeMinutes);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('svarīgumu šķiro pēc nozīmes, nevis alfabēta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/documents?sortBy=importance&sortOrder=asc&limit=100')
      .expect(200);
    const rank = { low: 0, medium: 1, high: 2, critical: 3 } as const;
    const ranks = res.body.items.map((d: { importance: keyof typeof rank }) => rank[d.importance]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('GET /api/documents/departments atgriež unikālas struktūrvienības', async () => {
    const res = await request(app.getHttpServer()).get('/api/documents/departments').expect(200);
    // Secība atkarīga no datubāzes collation, tāpēc salīdzinām saturu, nevis secību
    const expected = [...new Set(records.map((r) => r.department))];
    expect(res.body).toHaveLength(expected.length);
    expect(res.body).toEqual(expect.arrayContaining(expected));
  });

  it('GET /api/documents/:id', async () => {
    const res = await request(app.getHttpServer()).get('/api/documents/1').expect(200);
    expect(res.body.externalId).toBe('DOC-0001');
    await request(app.getHttpServer()).get('/api/documents/99999').expect(404);
  });

  it('GET /mock/files/:fileName atdod simulēto dokumentu', async () => {
    const res = await request(app.getHttpServer()).get('/mock/files/doc-0001.pdf').expect(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('DOC-0001');
    await request(app.getHttpServer()).get('/mock/files/doc-9999.pdf').expect(404);
  });

  it('noraida nederīgus parametrus ar 400', async () => {
    await request(app.getHttpServer()).get('/api/documents?sortBy=password').expect(400);
    await request(app.getHttpServer()).get('/api/documents?unknown=1').expect(400);
  });
});
