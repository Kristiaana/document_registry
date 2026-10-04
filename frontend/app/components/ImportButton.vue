<script setup lang="ts">
import type { ImportResult } from '~/utils/documents'

const emit = defineEmits<{ imported: [result: ImportResult] }>()

const { public: { apiBase } } = useRuntimeConfig()
const toast = useToast()
const importing = ref(false)

async function runImport() {
  importing.value = true
  try {
    const result = await $fetch<ImportResult>('/import', { baseURL: apiBase, method: 'POST' })
    toast.add({
      title: 'Imports pabeigts',
      description: `Jauni: ${result.created}, atjaunināti: ${result.updated}, izlaisti: ${result.skipped}`,
      color: 'success'
    })
    emit('imported', result)
  } catch (err) {
    const message = (err as { data?: { message?: string } }).data?.message ?? 'Neizdevās ielādēt datus'
    toast.add({ title: 'Imports neizdevās', description: message, color: 'error' })
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <UButton
    icon="i-lucide-download"
    label="Importēt no avota"
    variant="outline"
    :loading="importing"
    @click="runImport"
  />
</template>
