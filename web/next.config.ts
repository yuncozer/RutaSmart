import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // exceljs usa módulos de Node; se mantiene fuera del bundle del servidor
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
