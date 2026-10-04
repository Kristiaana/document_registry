import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from './document.entity';
import { QueryDocumentsDto } from './dto/query-documents.dto';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documents: Repository<DocumentEntity>,
  ) {}

  async findAll(query: QueryDocumentsDto): Promise<Paginated<DocumentEntity>> {
    const qb = this.documents.createQueryBuilder('d');

    if (query.search) {
      qb.andWhere('(d.title ILIKE :search OR d.description ILIKE :search)', {
        search: `%${escapeLike(query.search)}%`,
      });
    }
    if (query.importance?.length) {
      qb.andWhere('d.importance IN (:...importance)', { importance: query.importance });
    }
    if (query.category?.length) {
      qb.andWhere('d.category IN (:...category)', { category: query.category });
    }
    if (query.fileType?.length) {
      qb.andWhere('d.fileType IN (:...fileType)', { fileType: query.fileType });
    }
    if (query.department) {
      qb.andWhere('d.department = :department', { department: query.department });
    }
    if (query.active !== undefined) {
      qb.andWhere('d.active = :active', { active: query.active });
    }

    // sortBy ir validēts pret balto sarakstu DTO līmenī.
    // Enum kolonnas Postgres kārto pēc deklarācijas secības (low < ... < critical), nevis alfabētiski.
    qb.orderBy(`d.${query.sortBy}`, query.sortOrder === 'asc' ? 'ASC' : 'DESC').addOrderBy(
      'd.id',
      'ASC',
    );

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, total, page: query.page, limit: query.limit };
  }

  async findOne(id: number): Promise<DocumentEntity> {
    const doc = await this.documents.findOneBy({ id });
    if (!doc) throw new NotFoundException(`Dokuments ${id} nav atrasts`);
    return doc;
  }

  async departments(): Promise<string[]> {
    const rows = await this.documents
      .createQueryBuilder('d')
      .select('DISTINCT d.department', 'department')
      .orderBy('department')
      .getRawMany<{ department: string }>();
    return rows.map((r) => r.department);
  }
}

/** ILIKE šablonā %, _ un \ jāekranē, lai lietotāja ievade nedarbotos kā aizstājējzīmes. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => '\\' + c);
}
