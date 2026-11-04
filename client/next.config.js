const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  webpack: (config) => {
    // Required configuration for pdfjs-dist / react-pdf canvas rendering
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    config.resolve.alias['pdfjs-dist'] = path.resolve(__dirname, 'node_modules/pdfjs-dist');
    return config;
  },
};

module.exports = nextConfig;
