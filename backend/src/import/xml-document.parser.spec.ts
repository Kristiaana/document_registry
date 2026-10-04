import { parseDocumentsXml, XmlFormatError } from './xml-document.parser';

const doc = (id: string, overrides: Record<string, string> = {}) => {
  const fields: Record<string, string> = {
    title: 'Instrukcija par attālināto darbu',
    description: 'Apraksts &amp; detaļas',
    department: 'IT departaments',
    createdDate: '2025-03-14',
    url: 'https://example.lv/doc.pdf',
    fileType: 'pdf',
    readingTimeMinutes: '15',
    importance: 'high',
    category: 'internal',
    active: 'true',
    ...overrides,
  };
  const body = Object.entries(fields)
    .filter(([, v]) => v !== '__omit__')
    .map(([k, v]) => `<${k}>${v}</${k}>`)
    .join('');
  return `<document id="${id}">${body}</document>`;
};

const wrap = (...docs: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><documents>${docs.join('')}</documents>`;

describe('parseDocumentsXml', () => {
  it('parsē korektu ierakstu un konvertē tipus', () => {
    const { records, issues } = parseDocumentsXml(wrap(doc('DOC-1')));

    expect(issues).toEqual([]);
    expect(records).toEqual([
      {
        externalId: 'DOC-1',
        title: 'Instrukcija par attālināto darbu',
        description: 'Apraksts & detaļas',
        department: 'IT departaments',
        createdDate: '2025-03-14',
        url: 'https://example.lv/doc.pdf',
        fileType: 'pdf',
        readingTimeMinutes: 15,
        importance: 'high',
        category: 'internal',
        active: true,
      },
    ]);
  });

  it('vienu <document> elementu arī atgriež kā masīvu', () => {
    expect(parseDocumentsXml(wrap(doc('A'))).records).toHaveLength(1);
  });

  it('tukšs <documents> -> nav ierakstu', () => {
    expect(parseDocumentsXml('<documents></documents>')).toEqual({ records: [], issues: [] });
    expect(parseDocumentsXml('<documents/>')).toEqual({ records: [], issues: [] });
  });

  it('izlaiž nekorektus ierakstus, bet paturēt korektos', () => {
    const { records, issues } = parseDocumentsXml(
      wrap(
        doc('OK'),
        doc('BAD-ENUM', { importance: 'urgent', category: 'secret' }),
        doc('BAD-DATE', { createdDate: '14.03.2025' }),
        doc('BAD-NUM', { readingTimeMinutes: '-3' }),
        doc('BAD-URL', { url: 'javascript:alert(1)' }),
        doc('BAD-BOOL', { active: 'maybe' }),
        doc('MISSING', { title: '__omit__' }),
      ),
    );

    expect(records.map((r) => r.externalId)).toEqual(['OK']);
    expect(issues.map((i) => i.externalId)).toEqual([
      'BAD-ENUM',
      'BAD-DATE',
      'BAD-NUM',
      'BAD-URL',
      'BAD-BOOL',
      'MISSING',
    ]);
    expect(issues[0].errors).toHaveLength(2);
    expect(issues[5].errors).toEqual(['trūkst lauka <title>']);
  });

  it('atpazīst dublētus id', () => {
    const { records, issues } = parseDocumentsXml(wrap(doc('X'), doc('X')));
    expect(records).toHaveLength(1);
    expect(issues[0].errors[0]).toMatch(/dublēts id/);
  });

  it('pieņem xs:boolean vērtības 1/0 un nejūtīgs pret reģistru enum laukos', () => {
    const { records } = parseDocumentsXml(
      wrap(doc('A', { active: '0', importance: 'CRITICAL', fileType: 'DOCX' })),
    );
    expect(records[0]).toMatchObject({ active: false, importance: 'critical', fileType: 'docx' });
  });

  it('nekorekts XML -> XmlFormatError', () => {
    expect(() => parseDocumentsXml('<documents><document>')).toThrow(XmlFormatError);
  });

  it('cits saknes elements -> XmlFormatError', () => {
    expect(() => parseDocumentsXml('<files></files>')).toThrow(/<documents>/);
  });
});
