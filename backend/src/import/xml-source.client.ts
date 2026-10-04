import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';

export class XmlSourceError extends Error {}

/**
 * Ielādē XML no attālināta avota. Atbalsta http(s) URL un `file://` ceļus
 * (pēdējais noder, ja "attālinātais avots" ir ārējs fails).
 */
@Injectable()
export class XmlSourceClient {
  private readonly timeoutMs = 10_000;

  constructor(private readonly config: ConfigService) {}

  get sourceUrl(): string {
    return this.config.get<string>(
      'XML_SOURCE_URL',
      `http://localhost:${this.config.get('PORT', 3001)}/mock/documents.xml`,
    );
  }

  async fetchXml(source = this.sourceUrl): Promise<string> {
    const url = new URL(source);

    if (url.protocol === 'file:') {
      try {
        return await readFile(url, 'utf8');
      } catch (err) {
        throw new XmlSourceError(`Neizdevās nolasīt failu ${source}: ${(err as Error).message}`);
      }
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new XmlSourceError(`Neatbalstīts protokols: ${url.protocol}`);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'application/xml, text/xml' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new XmlSourceError(`Avots ${source} nav sasniedzams: ${(err as Error).message}`);
    }

    if (!response.ok) {
      throw new XmlSourceError(`Avots ${source} atbildēja ar HTTP ${response.status}`);
    }
    return response.text();
  }
}
