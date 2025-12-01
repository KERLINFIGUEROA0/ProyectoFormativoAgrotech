import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@heroui/react', '@mui/material', '@mui/icons-material', 'framer-motion'],
          charts: ['recharts'],
          maps: ['leaflet', 'react-leaflet', '@react-google-maps/api'],
          pdf: ['jspdf', 'jspdf-autotable'],
          utils: ['axios', 'formik', 'yup', 'jwt-decode', 'js-cookie', 'socket.io-client', 'mqtt'],
          icons: ['lucide-react', 'react-icons'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
