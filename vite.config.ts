import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to resolve Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env': env
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      // OPTIMIZATION: Code Splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Split React core
            vendor: ['react', 'react-dom', 'lucide-react'],
            // Split Firebase (it's heavy)
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            // Split Charts
            charts: ['recharts']
          }
        }
      },
      // Increase warning limit slightly to stop false alarms
      chunkSizeWarningLimit: 1000
    }
  };
});