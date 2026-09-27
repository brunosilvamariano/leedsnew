import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    webpackBuildWorker: false,
    workerThreads: true,
    cpus: 2,
    useTypeScriptCli: false,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
