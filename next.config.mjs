/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  publicRuntimeConfig: {
    MATCHES_BASE_URL: `${process.env.BASE_URL}/api/matches`,
    MATCH_EVENTS_WS_URL: `${process.env.WS_BASE_URL}/api/ws/match-events`,
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
