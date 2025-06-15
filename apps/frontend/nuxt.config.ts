export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  compatibilityDate: '2025-06-14',
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3333',
    }
  },
  devServer: {
    port: 3000,
  }
})