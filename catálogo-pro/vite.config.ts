import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // Ruta base del repositorio en GitHub
    base: '/giniexpress/', 
    
    plugins: [tailwindcss()],
    
    build: {
      // CORRECCIÓN: Envía la compilación a la raíz real del repositorio Git
      outDir: '../docs', 
      
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin.html'),
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});