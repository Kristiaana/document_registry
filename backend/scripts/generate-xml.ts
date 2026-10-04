/**
 * Ģenerē nejaušinātus testa datus un ieraksta tos XML failā.
 *
 *   npm run generate:xml -- --count=30 --seed=42 --out=data/documents.xml
 *   (--base-url=https://... - dokumentu saišu bāze; noklusējums http://localhost:3001/mock/files)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { documentsToXml, generateDocuments } from '../src/test-data/document-generator';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

const count = Number(arg('count') ?? 30);
const seed = arg('seed') !== undefined ? Number(arg('seed')) : Date.now();
const out = resolve(__dirname, '..', arg('out') ?? 'data/documents.xml');

if (!Number.isInteger(count) || count < 1) {
  console.error('--count jābūt pozitīvam veselam skaitlim');
  process.exit(1);
}

const xml = documentsToXml(generateDocuments({ count, seed, baseUrl: arg('base-url') }));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, xml, 'utf8');
console.log(`Uzģenerēti ${count} dokumenti (seed=${seed}) -> ${out}`);
