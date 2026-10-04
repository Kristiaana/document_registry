export const IMPORTANCE_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type Importance = (typeof IMPORTANCE_LEVELS)[number];

export const CATEGORIES = [
  'public',
  'internal',
  'restricted',
  'confidential',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const FILE_TYPES = ['pdf', 'docx', 'xlsx', 'pptx', 'odt', 'txt', 'html'] as const;
export type FileType = (typeof FILE_TYPES)[number];

/** Dokumenta metadati tādā formā, kādā tie nāk no XML avota. */
export interface DocumentRecord {
  externalId: string;
  title: string;
  description: string;
  department: string;
  createdDate: string; // YYYY-MM-DD
  url: string;
  fileType: FileType;
  readingTimeMinutes: number;
  importance: Importance;
  category: Category;
  active: boolean;
}
