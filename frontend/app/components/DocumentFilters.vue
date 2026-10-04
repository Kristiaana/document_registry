<script setup lang="ts">
import { CATEGORY, FILE_TYPES, IMPORTANCE, emptyFilters, toOptions, type DocumentFilters } from '~/utils/documents'

const props = defineProps<{ departments: string[] }>()
const filters = defineModel<DocumentFilters>({ required: true })

const importanceOptions = toOptions(IMPORTANCE)
const categoryOptions = toOptions(CATEGORY)
const fileTypeOptions = FILE_TYPES.map(value => ({ value, label: value.toUpperCase() }))
const activeOptions = [
  { value: 'all', label: 'Visi statusi' },
  { value: 'true', label: 'Aktīvi' },
  { value: 'false', label: 'Neaktīvi' }
]
const departmentOptions = computed(() => [
  { value: 'all', label: 'Visas struktūrvienības' },
  ...props.departments.map(d => ({ value: d, label: d }))
])

// Meklēšanas lauka debounce, lai nesūtītu pieprasījumu pēc katra simbola
const searchInput = ref(filters.value.search)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (filters.value.search = value), 300)
})
watch(() => filters.value.search, value => (searchInput.value = value))

const hasFilters = computed(() => JSON.stringify(filters.value) !== JSON.stringify(emptyFilters()))

function reset() {
  clearTimeout(searchTimer)
  filters.value = emptyFilters()
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
    <UInput
      v-model="searchInput"
      icon="i-lucide-search"
      placeholder="Meklēt nosaukumā vai aprakstā..."
      class="sm:col-span-2 lg:col-span-3 xl:col-span-2"
    />
    <USelect
      v-model="filters.importance"
      :items="importanceOptions"
      multiple
      placeholder="Svarīgums"
    />
    <USelect
      v-model="filters.category"
      :items="categoryOptions"
      multiple
      placeholder="Kategorija"
    />
    <USelect
      v-model="filters.fileType"
      :items="fileTypeOptions"
      multiple
      placeholder="Faila tips"
    />
    <USelect
      v-model="filters.active"
      :items="activeOptions"
    />
    <USelect
      v-model="filters.department"
      :items="departmentOptions"
      class="sm:col-span-2"
    />
    <UButton
      v-if="hasFilters"
      icon="i-lucide-x"
      label="Notīrīt filtrus"
      color="neutral"
      variant="ghost"
      class="justify-self-start"
      @click="reset"
    />
  </div>
</template>
