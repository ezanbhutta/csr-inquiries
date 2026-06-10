import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CSR Inquiries is a static SPA — no backend. Data is fetched client-side
// from the public Google Sheets gviz CSV endpoint at runtime.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, host: true },
  preview: { port: 4174, host: true },
})
