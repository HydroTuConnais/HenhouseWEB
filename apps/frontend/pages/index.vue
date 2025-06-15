<template>
  <div class="p-8">
    <UCard>
      <template #header>
        <h1 class="text-2xl font-bold">Mon Application</h1>
      </template>
      
      <div v-if="pending">
        <USkeleton class="h-4 w-[250px]" />
      </div>
      
      <div v-else-if="error">
        <UAlert
          icon="i-heroicons-exclamation-triangle"
          color="red"
          variant="soft"
          title="Erreur"
          :description="error.message"
        />
      </div>
      
      <div v-else>
        <ul class="space-y-2">
          <li v-for="user in data.users" :key="user.id">
            <UBadge>{{ user.name }}</UBadge>
          </li>
        </ul>
      </div>
    </UCard>
  </div>
</template>

<script setup>
const { data, pending, error } = await $fetch('/api/users', {
  baseURL: useRuntimeConfig().public.apiBase
})
</script>