/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@ip-review/db',
    '@ip-review/domain',
    '@ip-review/workflows',
  ],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

module.exports = nextConfig;
