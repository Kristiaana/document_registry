import { XMLBuilder } from 'fast-xml-parser';
import {
  CATEGORIES,
  FILE_TYPES,
  IMPORTANCE_LEVELS,
  type DocumentRecord,
} from '../documents/document.types';

/** Mulberry32 - mazs deterministisks PRNG, lai testa datus var atkārtot ar to pašu seed. */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEPARTMENTS = [
  'Finanšu departaments',
  'Juridiskā nodaļa',
  'Personāla vadības nodaļa',
  'IT departaments',
  'Komunikācijas nodaļa',
  'Iepirkumu nodaļa',
  'Kvalitātes vadības nodaļa',
  'Klientu apkalpošanas centrs',
];

const DOC_KINDS = [
  'Nolikums',
  'Rīkojums',
  'Instrukcija',
  'Politika',
  'Pārskats',
  'Procedūra',
  'Vadlīnijas',
  'Ziņojums',
  'Līgums',
  'Plāns',
];

const SUBJECTS = [
  'informācijas drošības jomā',
  'par darba laika uzskaiti',
  'par iepirkumu organizēšanu',
  'par personas datu apstrādi',
  'par attālināto darbu',
  'par komandējumiem',
  'par dokumentu pārvaldību',
  'par krīzes komunikāciju',
  'par budžeta plānošanu',
  'par jaunu darbinieku ievadīšanu',
  'par IT resursu lietošanu',
  'par iekšējo kontroli',
];

const DESCRIPTION_PARTS = [
  'Nosaka kārtību un atbildīgās personas.',
  'Apraksta procesa soļus un termiņus.',
  'Satur prasības, kas jāievēro visiem darbiniekiem.',
  'Aktualizēts atbilstoši normatīvo aktu izmaiņām.',
  'Ietver veidlapu paraugus un pielikumus.',
  'Paredzēts iekšējai lietošanai ikdienas darbā.',
  'Sagatavots, pamatojoties uz iepriekšējā gada rezultātiem.',
];

export interface GenerateOptions {
  count: number;
  seed?: number;
  /** Datumu diapazona beigas (ieskaitot); noklusējums - šodiena. */
  until?: Date;
  /** Dokumentu saišu bāze; noklusējums - backend simulētie faili. */
  baseUrl?: string;
}

export const DEFAULT_FILES_BASE_URL = 'http://localhost:3001/mock/files';

export function generateDocuments({
  count,
  seed = Date.now(),
  until = new Date(),
  baseUrl = DEFAULT_FILES_BASE_URL,
}: GenerateOptions): DocumentRecord[] {
  const base = baseUrl.replace(/\/+$/, '');
  const rand = createRandom(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const threeYearsMs = 3 * 365 * 24 * 60 * 60 * 1000;

  return Array.from({ length: count }, (_, i) => {
    const externalId = `DOC-${String(i + 1).padStart(4, '0')}`;
    const fileType = pick(FILE_TYPES);
    const created = new Date(until.getTime() - Math.floor(rand() * threeYearsMs));
    const description = [pick(DESCRIPTION_PARTS), pick(DESCRIPTION_PARTS)]
      .filter((p, idx, arr) => arr.indexOf(p) === idx)
      .join(' ');

    return {
      externalId,
      title: `${pick(DOC_KINDS)} ${pick(SUBJECTS)}`,
      description,
      department: pick(DEPARTMENTS),
      createdDate: created.toISOString().slice(0, 10),
      url: `${base}/${externalId.toLowerCase()}.${fileType}`,
      fileType,
      readingTimeMinutes: int(2, 90),
      importance: pick(IMPORTANCE_LEVELS),
      category: pick(CATEGORIES),
      active: rand() < 0.8,
    };
  });
}

export function documentsToXml(records: DocumentRecord[], generatedAt = new Date()): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    indentBy: '  ',
  });

  const body = builder.build({
    documents: {
      '@_generatedAt': generatedAt.toISOString(),
      document: records.map(({ externalId, ...fields }) => ({
        '@_id': externalId,
        ...fields,
        active: String(fields.active),
      })),
    },
  }) as string;

  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}
