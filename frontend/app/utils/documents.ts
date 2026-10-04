export type Importance = 'low' | 'medium' | 'high' | 'critical'
export type Category = 'public' | 'internal' | 'restricted' | 'confidential'
export type FileType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'odt' | 'txt' | 'html'
export type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export interface DocumentItem {
  id: number
  externalId: string
  title: string
  description: string
  department: string
  createdDate: string
  url: string
  fileType: FileType
  readingTimeMinutes: number
  importance: Importance
  category: Category
  active: boolean
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface ImportResult {
  received: number
  created: number
  updated: number
  skipped: number
}

export const IMPORTANCE: Record<Importance, { label: string, color: BadgeColor }> = {
  low: { label: 'Zems', color: 'neutral' },
  medium: { label: 'Vidējs', color: 'info' },
  high: { label: 'Augsts', color: 'warning' },
  critical: { label: 'Kritisks', color: 'error' }
}

export const CATEGORY: Record<Category, { label: string, color: BadgeColor }> = {
  public: { label: 'Publisks', color: 'success' },
  internal: { label: 'Iekšējs', color: 'info' },
  restricted: { label: 'Ierobežotas pieejamības', color: 'warning' },
  confidential: { label: 'Konfidenciāls', color: 'error' }
}

export const FILE_TYPES: FileType[] = ['pdf', 'docx', 'xlsx', 'pptx', 'odt', 'txt', 'html']

export const toOptions = <K extends string>(map: Record<K, { label: string }>) =>
  (Object.keys(map) as K[]).map(value => ({ value, label: map[value].label }))

export type ActiveFilter = 'all' | 'true' | 'false'

export interface DocumentFilters {
  search: string
  importance: Importance[]
  category: Category[]
  fileType: FileType[]
  department: string
  active: ActiveFilter
}

export const emptyFilters = (): DocumentFilters => ({
  search: '',
  importance: [],
  category: [],
  fileType: [],
  department: 'all',
  active: 'all'
})

export interface SortState {
  id: string
  desc: boolean
}

/** Filtru, šķirošanas un lapošanas stāvokli pārvērš API query parametros, izlaižot tukšās vērtības. */
export function buildQuery(
  filters: DocumentFilters,
  sort: SortState | undefined,
  page: number,
  limit: number
): Record<string, string | number> {
  const query: Record<string, string | number> = { page, limit }
  const search = filters.search.trim()
  if (search) query.search = search
  if (filters.importance.length) query.importance = filters.importance.join(',')
  if (filters.category.length) query.category = filters.category.join(',')
  if (filters.fileType.length) query.fileType = filters.fileType.join(',')
  if (filters.department && filters.department !== 'all') query.department = filters.department
  if (filters.active !== 'all') query.active = filters.active
  if (sort) {
    query.sortBy = sort.id
    query.sortOrder = sort.desc ? 'desc' : 'asc'
  }
  return query
}

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('lv-LV', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))

export function formatReadingTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}
