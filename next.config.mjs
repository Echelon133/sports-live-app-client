/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  publicRuntimeConfig: {
    MATCHES_BASE_URL: `${process.env.BASE_URL}/api/matches`,
    COMPETITIONS_BASE_URL: `${process.env.BASE_URL}/api/competitions`,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/wikipedia/**'
      },
    ]
  }
};

export default nextConfig;
