import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  hooks: {
    'vite:extendConfig': (config) => {
      config.plugins!.push(nodePolyfills())
    },
  },
})
