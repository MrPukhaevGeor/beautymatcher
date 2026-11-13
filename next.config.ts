import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // Сквозные тесты собираются в отдельную папку и не мешают обычному dev-серверу.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["sharp", "nodemailer"],
};

export default config;
