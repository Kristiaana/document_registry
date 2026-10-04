import { generateDocuments } from '../test-data/document-generator';
import { renderDocumentPage } from './mock-source.controller';

describe('renderDocumentPage', () => {
  const [doc] = generateDocuments({ count: 1, seed: 1, until: new Date('2026-01-01') });

  it('attēlo dokumenta metadatus', () => {
    const html = renderDocumentPage(doc);
    expect(html).toContain(doc.title);
    expect(html).toContain(doc.department);
    expect(html).toContain(doc.externalId);
  });

  it('ekranē HTML, lai XML saturs nevarētu ievietot skriptus', () => {
    const html = renderDocumentPage({ ...doc, title: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
