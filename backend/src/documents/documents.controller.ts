import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@Query() query: QueryDocumentsDto) {
    return this.documentsService.findAll(query);
  }

  /** Unikālās struktūrvienības - filtra izvēlnei */
  @Get('departments')
  departments() {
    return this.documentsService.departments();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.findOne(id);
  }
}
