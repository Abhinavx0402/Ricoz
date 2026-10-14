/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    // Only rewrite if API URL is relative (i.e. /api/v1)
    // When NEXT_PUBLIC_API_URL is a full URL, frontend calls it directly
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    if (apiUrl.startsWith('http')) {
      return []; // No rewrites needed — frontend calls external API directly
    }
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
