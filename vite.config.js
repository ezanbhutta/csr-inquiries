import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CSR Inquiries is a static SPA — no backend. Data is fetched client-side
// from the public Google Sheets gviz CSV endpoint at runtime.
// On GitHub Pages the site is served under /csr-inquiries/; elsewhere (Vercel,
// local) it's served at the root.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/csr-inquiries/' : '/',
  plugins: [react()],
  server: { port: 5174, host: true },
  preview: { port: 4174, host: true },
})
