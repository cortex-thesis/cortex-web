import { defineConfig } from '@playwright/test'
const port = Number(process.env.CORTEX_BROWSER_TEST_PORT || 31073)
export default defineConfig({
  testDir: './browser-tests',
  timeout: 30000,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [['json', { outputFile: process.env.CORTEX_BROWSER_RESULTS || '../.runtime/validation-browser.json' }]],
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: 'chromium', trace: 'off', screenshot: 'off', video: 'off' },
  outputDir: process.env.CORTEX_BROWSER_ARTIFACTS || '../.runtime/browser-artifacts',
  webServer: {
    command: `"${process.execPath}" node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 60000,
    env: { VITE_TEMPLATE_ONLY: 'false' },
  },
})
