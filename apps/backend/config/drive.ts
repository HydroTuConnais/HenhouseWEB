import { defineConfig, services } from '@adonisjs/drive'

export default defineConfig({
  default: 'fs',

  services: {
    fs: services.fs({
      location: './public/uploads',
      visibility: 'public',
      serveFiles: true,
      routeBasePath: '/uploads',
    }),
  },
})
