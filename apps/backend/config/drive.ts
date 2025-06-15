import { defineConfig } from '@adonisjs/drive'

export default defineConfig({
  default: 'fs',

  services: {
    fs: {
      driver: 'fs',
      root: './public/uploads',
      serveFiles: true,
      basePath: '/uploads',
    },
  },
})
