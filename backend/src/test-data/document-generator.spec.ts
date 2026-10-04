import { parseDocumentsXml } from '../import/xml-document.parser';
import { documentsToXml, generateDocuments } from './document-generator';

describe('document generator', () => {
  const until = new Date('2026-01-01T00:00:00Z');

  it('ar vienu un to pašu seed ģenerē identiskus datus', () => {
    expect(generateDocuments({ count: 10, seed: 7, until })).toEqual(
      generateDocuments({ count: 10, seed: 7, until }),
    );
  });

  it('ar dažādiem seed ģenerē atšķirīgus datus', () => {
    expect(generateDocuments({ count: 10, seed: 1, until })).not.toEqual(
      generateDocuments({ count: 10, seed: 2, until }),
    );
  });

  it('ģenerētais XML iziet cauri parserim bez kļūdām (round-trip)', () => {
    const records = generateDocuments({ count: 200, seed: 42, until });
    const { records: parsed, issues } = parseDocumentsXml(documentsToXml(records));

    expect(issues).toEqual([]);
    expect(parsed).toEqual(records);
  });

  it('datumi ir pēdējo 3 gadu robežās', () => {
    for (const r of generateDocuments({ count: 100, seed: 3, until })) {
      expect(r.createdDate >= '2023-01-01' && r.createdDate <= '2026-01-01').toBe(true);
    }
  });

  it('saites pēc noklusējuma ved uz simulētajiem failiem, bāzi var mainīt', () => {
    const [a] = generateDocuments({ count: 1, seed: 1, until });
    expect(a.url).toBe(`http://localhost:3001/mock/files/doc-0001.${a.fileType}`);

    const [b] = generateDocuments({ count: 1, seed: 1, until, baseUrl: 'https://docs.test/f/' });
    expect(b.url).toBe(`https://docs.test/f/doc-0001.${b.fileType}`);
  });

  it('XML ekranē speciālos simbolus', () => {
    const [record] = generateDocuments({ count: 1, seed: 1, until });
    const xml = documentsToXml([{ ...record, title: 'A & B <C>' }]);
    expect(xml).toContain('A &amp; B &lt;C&gt;');
    expect(parseDocumentsXml(xml).records[0].title).toBe('A & B <C>');
  });
});
