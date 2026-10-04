import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  CATEGORIES,
  FILE_TYPES,
  IMPORTANCE_LEVELS,
  type Category,
  type FileType,
  type Importance,
} from '../document.types';

export const SORTABLE_FIELDS = [
  'title',
  'department',
  'createdDate',
  'fileType',
  'readingTimeMinutes',
  'importance',
  'category',
  'active',
] as const;
export type SortField = (typeof SORTABLE_FIELDS)[number];

/** `?importance=high,critical` un `?importance=high&importance=critical` -> ['high', 'critical'] */
const toList = ({ value }: { value: unknown }): unknown =>
  value === undefined || value === ''
    ? undefined
    : (Array.isArray(value) ? value : [value]).flatMap((v) => String(v).split(',')).filter(Boolean);

export class QueryDocumentsDto {
  /** Teksta meklēšana nosaukumā un aprakstā */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Transform(toList)
  @IsIn(IMPORTANCE_LEVELS, { each: true })
  importance?: Importance[];

  @IsOptional()
  @Transform(toList)
  @IsIn(CATEGORIES, { each: true })
  category?: Category[];

  @IsOptional()
  @Transform(toList)
  @IsIn(FILE_TYPES, { each: true })
  fileType?: FileType[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  department?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy: SortField = 'createdDate';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
