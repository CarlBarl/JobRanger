import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.integration.test.{ts,tsx}'],
    exclude: ['**/*.upstash.integration.test.{ts,tsx}', 'node_modules/', '.next/', 'dist/'],
  },
})

