import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  CATEGORIES,
  FILE_TYPES,
  IMPORTANCE_LEVELS,
  type Category,
  type FileType,
  type Importance,
} from './document.types';

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Identifikators no XML avota (atribūts `id`) - pēc tā imports veic upsert. */
  @Index({ unique: true })
  @Column({ name: 'external_id', length: 64 })
  externalId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({ length: 255 })
  department: string;

  @Index()
  @Column({ name: 'created_date', type: 'date' })
  createdDate: string;

  @Column({ length: 2048 })
  url: string;

  @Column({ name: 'file_type', type: 'enum', enum: FILE_TYPES })
  fileType: FileType;

  @Column({ name: 'reading_time_minutes', type: 'int' })
  readingTimeMinutes: number;

  @Index()
  @Column({ type: 'enum', enum: IMPORTANCE_LEVELS, enumName: 'importance_level' })
  importance: Importance;

  @Index()
  @Column({ type: 'enum', enum: CATEGORIES, enumName: 'document_category' })
  category: Category;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
