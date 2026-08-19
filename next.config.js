/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // "standalone" produces a self-contained Node server output.
  // This works on Vercel today and lets you `node server.js` on your own
  // VPS later with zero code changes — only the hosting target changes.
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
