import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // 1. Ruta base con el nombre de tu repositorio de GitHub para que carguen los estilos y scripts
    base: '/giniexpress/', 
    
    plugins: [tailwindcss()],
    
    build: {
      // 2. Le decimos a Vite que guarde la compilación en 'docs' para GitHub Pages
      outDir: 'docs', 
      
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