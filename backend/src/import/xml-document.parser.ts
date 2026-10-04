import { XMLParser, XMLValidator } from 'fast-xml-parser';
import {
  CATEGORIES,
  FILE_TYPES,
  IMPORTANCE_LEVELS,
  type DocumentRecord,
} from '../documents/document.types';

export class XmlFormatError extends Error {}

export interface ParseIssue {
  /** Ieraksta kārtas numurs XML failā (sākot no 1). */
  index: number;
  externalId?: string;
  errors: string[];
}

export interface ParseResult {
  records: DocumentRecord[];
  issues: ParseIssue[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Visas vērtības paliek virknes - tipus pārbaudām un konvertējam paši.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name, jpath) => jpath === 'documents.document',
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BOOLEAN_VALUES: Record<string, boolean> = {
  // Tās pašas vērtības, ko pieļauj xs:boolean
  true: true,
  false: false,
  '1': true,
  '0': false,
};

/**
 * Parsē dokumentu XML. Nekorekts XML kopumā -> XmlFormatError;
 * atsevišķi nekorekti ieraksti tiek izlaisti un atgriezti `issues` sarakstā,
 * lai viens bojāts ieraksts neapturētu visu importu.
 */
export function parseDocumentsXml(xml: string): ParseResult {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new XmlFormatError(
      `Nekorekts XML (rinda ${validation.err.line}): ${validation.err.msg}`,
    );
  }

  const parsed = parser.parse(xml) as {
    documents?: { document?: Record<string, unknown>[] } | '';
  };
  if (parsed.documents === undefined) {
    throw new XmlFormatError('Trūkst saknes elementa <documents>');
  }

  const raw =
    typeof parsed.documents === 'object' ? (parsed.documents.document ?? []) : [];
  const records: DocumentRecord[] = [];
  const issues: ParseIssue[] = [];
  const seenIds = new Set<string>();

  raw.forEach((node, i) => {
    const { record, errors } = toRecord(node);
    if (record && seenIds.has(record.externalId)) {
      errors.push(`dublēts id "${record.externalId}"`);
    }
    if (errors.length > 0 || !record) {
      issues.push({ index: i + 1, externalId: str(node['@_id']), errors });
      return;
    }
    seenIds.add(record.externalId);
    records.push(record);
  });

  return { records, issues };
}

function str(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object') return undefined;
  return String(value).trim();
}

function toRecord(node: Record<string, unknown>): {
  record?: DocumentRecord;
  errors: string[];
} {
  const errors: string[] = [];

  const required = (field: string, max?: number): string => {
    const value = str(node[field]);
    if (!value) {
      errors.push(`trūkst lauka <${field}>`);
      return '';
    }
    if (max && value.length > max) errors.push(`<${field}> garāks par ${max} simboliem`);
    return value;
  };

  const oneOf = <T extends string>(field: string, allowed: readonly T[]): T => {
    const value = required(field).toLowerCase();
    if (value && !allowed.includes(value as T)) {
      errors.push(`<${field}> nederīga vērtība "${value}"`);
    }
    return value as T;
  };

  const externalId = str(node['@_id']) ?? '';
  if (!externalId) errors.push('trūkst atribūta id');

  const title = required('title', 255);
  const description = required('description');
  const department = required('department', 255);

  const createdDate = required('createdDate');
  if (createdDate && (!DATE_RE.test(createdDate) || isNaN(Date.parse(createdDate)))) {
    errors.push(`<createdDate> nav datums formātā YYYY-MM-DD: "${createdDate}"`);
  }

  const url = required('url', 2048);
  if (url && !isHttpUrl(url)) errors.push(`<url> nav derīga http(s) saite: "${url}"`);

  const fileType = oneOf('fileType', FILE_TYPES);

  const readingRaw = required('readingTimeMinutes');
  const readingTimeMinutes = Number(readingRaw);
  if (readingRaw && (!Number.isInteger(readingTimeMinutes) || readingTimeMinutes < 0)) {
    errors.push(`<readingTimeMinutes> jābūt nenegatīvam veselam skaitlim: "${readingRaw}"`);
  }

  const importance = oneOf('importance', IMPORTANCE_LEVELS);
  const category = oneOf('category', CATEGORIES);

  const activeRaw = required('active').toLowerCase();
  const active = BOOLEAN_VALUES[activeRaw];
  if (activeRaw && active === undefined) {
    errors.push(`<active> nederīga vērtība "${activeRaw}"`);
  }

  if (errors.length > 0) return { errors };
  return {
    errors,
    record: {
      externalId,
      title,
      description,
      department,
      createdDate,
      url,
      fileType,
      readingTimeMinutes,
      importance,
      category,
      active,
    },
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
