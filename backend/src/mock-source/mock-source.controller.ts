import { Controller, Get, Header, NotFoundException, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { DocumentRecord } from '../documents/document.types';
import { parseDocumentsXml } from '../import/xml-document.parser';

/**
 * Simulēta ārējā sistēma:
 * - `GET /mock/documents.xml` - XML eksports (`data/documents.xml`, ko ģenerē `npm run generate:xml`);
 * - `GET /mock/files/:fileName` - "dokuments", uz kuru ved ieraksta `<url>`.
 *   Īstu failu nav, tāpēc tiek atgriezta HTML lapa ar dokumenta metadatiem.
 */
@Controller('mock')
export class MockSourceController {
  constructor(private readonly config: ConfigService) {}

  @Get('documents.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async documents(): Promise<string> {
    return this.readXml();
  }

  @Get('files/:fileName')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async file(@Param('fileName') fileName: string): Promise<string> {
    const id = fileName.replace(/\.[^.]+$/, '').toLowerCase();
    const { records } = parseDocumentsXml(await this.readXml());
    const doc = records.find((r) => r.externalId.toLowerCase() === id);
    if (!doc) throw new NotFoundException(`Dokuments ${fileName} nav atrasts`);
    return renderDocumentPage(doc);
  }

  private async readXml(): Promise<string> {
    const file = resolve(this.config.get('MOCK_XML_FILE', 'data/documents.xml'));
    try {
      return await readFile(file, 'utf8');
    } catch {
      throw new NotFoundException(
        `XML fails nav atrasts: ${file}. Palaidiet "npm run generate:xml".`,
      );
    }
  }
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export function renderDocumentPage(doc: DocumentRecord): string {
  const rows: [string, string][] = [
    ['Identifikators', doc.externalId],
    ['Struktūrvienība', doc.department],
    ['Izveides datums', doc.createdDate],
    ['Faila tips', doc.fileType.toUpperCase()],
    ['Lasīšanas laiks', `${doc.readingTimeMinutes} min`],
    ['Svarīgums', doc.importance],
    ['Kategorija', doc.category],
    ['Aktīvs', doc.active ? 'jā' : 'nē'],
  ];

  return `<!doctype html>
<html lang="lv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc.title)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 48px auto; padding: 0 16px; color: #1e293b; }
  table { border-collapse: collapse; width: 100%; margin-top: 24px; }
  td { padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
  td:first-child { color: #64748b; width: 40%; }
</style>
</head>
<body>
  <h1>${escapeHtml(doc.title)}</h1>
  <p>${escapeHtml(doc.description)}</p>
  <table>
    ${rows.map(([k, v]) => `<tr><td>${k}</td><td>${escapeHtml(v)}</td></tr>`).join('\n    ')}
  </table>
</body>
</html>`;
}
