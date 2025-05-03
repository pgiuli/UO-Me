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
  allowedDevOrigins: [
    "https://uo-me.giuli.cat",
    "http://uo-me.giuli.cat",
    "http://localhost:3000",
  ],
};

module.exports = nextConfig;