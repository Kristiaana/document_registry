<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Column } from '@tanstack/vue-table'
import {
  CATEGORY,
  IMPORTANCE,
  formatDate,
  formatReadingTime,
  type DocumentItem,
  type SortState
} from '~/utils/documents'

defineProps<{ items: DocumentItem[], loading: boolean }>()
// Šķirošana notiek serverī, tabula tikai maina stāvokli
const sorting = defineModel<SortState[]>('sorting', { required: true })

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const ULink = resolveComponent('ULink')

function sortableHeader(label: string) {
  return ({ column }: { column: Column<DocumentItem> }) => {
    const sorted = column.getIsSorted()
    return h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      label,
      icon: sorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : sorted === 'desc'
          ? 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
      class: '-mx-2.5',
      onClick: () => column.toggleSorting(sorted === 'asc')
    })
  }
}

const columns: TableColumn<DocumentItem>[] = [
  {
    accessorKey: 'title',
    header: sortableHeader('Nosaukums'),
    cell: ({ row }) => h('div', { class: 'max-w-sm' }, [
      h(ULink, {
        to: row.original.url,
        target: '_blank',
        class: 'font-medium text-highlighted hover:underline'
      }, () => row.original.title),
      h('p', { class: 'text-muted text-xs truncate', title: row.original.description }, row.original.description)
    ])
  },
  { accessorKey: 'department', header: sortableHeader('Struktūrvienība') },
  {
    accessorKey: 'createdDate',
    header: sortableHeader('Izveidots'),
    cell: ({ row }) => h('span', { class: 'whitespace-nowrap' }, formatDate(row.original.createdDate))
  },
  {
    accessorKey: 'fileType',
    header: sortableHeader('Tips'),
    cell: ({ row }) => h(UBadge, { variant: 'outline', color: 'neutral' }, () => row.original.fileType.toUpperCase())
  },
  {
    accessorKey: 'readingTimeMinutes',
    header: sortableHeader('Lasīšanas laiks'),
    cell: ({ row }) => h('span', { class: 'whitespace-nowrap' }, formatReadingTime(row.original.readingTimeMinutes))
  },
  {
    accessorKey: 'importance',
    header: sortableHeader('Svarīgums'),
    cell: ({ row }) => {
      const meta = IMPORTANCE[row.original.importance]
      return h(UBadge, { variant: 'subtle', color: meta.color }, () => meta.label)
    }
  },
  {
    accessorKey: 'category',
    header: sortableHeader('Kategorija'),
    cell: ({ row }) => {
      const meta = CATEGORY[row.original.category]
      return h(UBadge, { variant: 'subtle', color: meta.color, class: 'whitespace-nowrap' }, () => meta.label)
    }
  },
  {
    accessorKey: 'active',
    header: sortableHeader('Aktīvs'),
    cell: ({ row }) => h(UBadge, {
      variant: 'soft',
      color: row.original.active ? 'success' : 'neutral'
    }, () => (row.original.active ? 'Jā' : 'Nē'))
  }
]
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <UTable
      v-model:sorting="sorting"
      :sorting-options="{ manualSorting: true, enableSortingRemoval: false }"
      :data="items"
      :columns="columns"
      :loading="loading"
      empty="Nav atrasts neviens dokuments"
    />
  </UCard>
</template>
