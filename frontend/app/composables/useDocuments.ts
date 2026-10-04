import { buildQuery, emptyFilters, type DocumentItem, type Paginated, type SortState } from '~/utils/documents'

export const PAGE_SIZE = 15

/** Dokumentu saraksta stāvoklis (filtri, šķirošana, lapošana) un datu ielāde no API. */
export async function useDocuments() {
  const { public: { apiBase } } = useRuntimeConfig()

  const filters = ref(emptyFilters())
  const sorting = ref<SortState[]>([{ id: 'createdDate', desc: true }])
  const page = ref(1)

  // Mainoties filtriem vai šķirošanai, atgriežamies uz pirmo lapu
  watch([filters, sorting], () => (page.value = 1), { deep: true })

  const query = computed(() => buildQuery(filters.value, sorting.value[0], page.value, PAGE_SIZE))

  const [documents, departments] = await Promise.all([
    useFetch<Paginated<DocumentItem>>('/documents', { baseURL: apiBase, query }),
    useFetch<string[]>('/documents/departments', { baseURL: apiBase, default: () => [] })
  ])

  return {
    apiBase,
    filters,
    sorting,
    page,
    items: computed(() => documents.data.value?.items ?? []),
    total: computed(() => documents.data.value?.total ?? 0),
    loading: computed(() => documents.status.value === 'pending'),
    error: documents.error,
    departments: departments.data,
    refresh: () => Promise.all([documents.refresh(), departments.refresh()])
  }
}
