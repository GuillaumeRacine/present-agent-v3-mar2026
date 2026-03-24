/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // better-sqlite3 is a native module — must be external
    serverComponentsExternalPackages: ["better-sqlite3"],

    // Persist data directory across builds
    outputFileTracingIncludes: {
      "/**": ["./data/**"],
    },
  },
};

export default nextConfig;
