import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      "all",
      "ce87-2400-c600-5407-e945-286f-6756-204b-30b.ngrok-free.app",
    ],
  },
});
