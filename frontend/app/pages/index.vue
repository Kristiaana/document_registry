<script setup lang="ts">
import { PAGE_SIZE } from '~/composables/useDocuments'

const {
  apiBase,
  filters,
  sorting,
  page,
  items,
  total,
  loading,
  error,
  departments,
  refresh
} = await useDocuments()
</script>

<template>
  <UContainer class="space-y-6 py-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          Dokumentu reģistrs
        </h1>
        <p class="text-sm text-muted">
          {{ total }} dokumenti
        </p>
      </div>
      <div class="flex items-center gap-2">
        <ImportButton @imported="refresh" />
        <UColorModeButton />
      </div>
    </div>

    <DocumentFilters
      v-model="filters"
      :departments="departments"
    />

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Neizdevās ielādēt dokumentus"
      :description="`Pārbaudiet, vai backend darbojas (${apiBase}).`"
    />

    <DocumentsTable
      v-model:sorting="sorting"
      :items="items"
      :loading="loading"
    />

    <div
      v-if="total > PAGE_SIZE"
      class="flex justify-center"
    >
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="PAGE_SIZE"
      />
    </div>
  </UContainer>
</template>
