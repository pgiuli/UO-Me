/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/static/:path*',
        destination: 'http://localhost:8000/static/:path*', // Proxy only /static to FastAPI
      },
    ];
  },
};

module.exports = nextConfig;