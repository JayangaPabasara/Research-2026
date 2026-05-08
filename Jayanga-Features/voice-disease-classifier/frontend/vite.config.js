import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // Proxy API calls to FastAPI backend during development
      "/api": {
        target: ["http://localhost:8000", " https://1513-112-135-67-95.ngrok-free.app"],
        changeOrigin: true,
         headers: {
          'ngrok-skip-browser-warning': 'true'   // ← skip ngrok warning page
        }
      },
    },
  },
});
