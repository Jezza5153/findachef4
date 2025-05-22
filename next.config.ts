import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // allowedDevOrigins: [ // This line and the one below were removed
    //   "https://9004-firebase-studio-1747403680894.cluster-ancjwrkgr5dvux4qug5rbzyc2y.cloudworkstations.dev"
    // ],
  },
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.handlebars$/,
      loader: 'handlebars-loader',
    });

    // Return the modified config
    return config;
  },

};


export default nextConfig;
