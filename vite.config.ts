import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './', // 支持 Electron 加载
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // 代理 ModelScope API 任务查询请求
          '/api/proxy': {
            target: 'https://api-inference.modelscope.cn',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/proxy/, ''),
            secure: false,
            configure: (proxy, options) => {
              proxy.on('error', (err, req, res) => {
                console.log('ModelScope proxy error:', err);
              });
              proxy.on('proxyReq', (proxyReq, req, res) => {
                console.log('Sending request to ModelScope:', req.method, req.url);
              });
            },
          },
        },
      },
      css: {
        postcss: './postcss.config.js' // 指向不存在的文件，禁用 PostCSS
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
