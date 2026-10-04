import { BadGatewayException, BadRequestException, Controller, HttpCode, Post } from '@nestjs/common';
import { ImportService, type ImportResult } from './import.service';
import { XmlFormatError } from './xml-document.parser';
import { XmlSourceError } from './xml-source.client';

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /** Palaiž importu no konfigurētā attālinātā avota (XML_SOURCE_URL). */
  @Post()
  @HttpCode(200)
  async run(): Promise<ImportResult> {
    try {
      return await this.importService.importFromSource();
    } catch (err) {
      if (err instanceof XmlSourceError) throw new BadGatewayException(err.message);
      if (err instanceof XmlFormatError) throw new BadRequestException(err.message);
      throw err;
    }
  }
}
