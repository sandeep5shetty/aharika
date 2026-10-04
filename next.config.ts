import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/harshitproject/**",
      },
      {
        protocol: "https",
        hostname: "cdn.shadcnstudio.com",
        pathname: "/ss-assets/**",
      },
    ],
  },
};

export default nextConfig;
