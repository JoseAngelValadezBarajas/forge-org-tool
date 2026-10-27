import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const apiPort = Number(process.env.FORGE_E2E_API_PORT ?? 8000);

if (!Number.isInteger(apiPort) || apiPort < 1024 || apiPort > 65535) {
  throw new Error('FORGE_E2E_API_PORT must be an integer between 1024 and 65535');
}

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    host: process.env.FORGE_ANDROID_DEV === '1' ? '0.0.0.0' : '127.0.0.1',
    proxy: { '/api': `http://127.0.0.1:${apiPort}` },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**'],
    server: { deps: { inline: [/@corefoundry-labs/] } },
  },
});
