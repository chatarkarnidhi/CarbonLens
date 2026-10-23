import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const lambdaTarget = (
    env.VITE_DEV_BACKEND_URL ||
    env.VITE_API_BASE_URL ||
    'https://ckgxkvs7bd4i5qigdkgmqlvrem0jvlfd.lambda-url.eu-north-1.on.aws'
  ).trim().replace(/\/+$/, '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: lambdaTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
      },
    },
  };
});

