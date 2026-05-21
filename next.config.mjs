/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.practo.com" },
      { protocol: "https", hostname: "**.practostatic.com" },
      { protocol: "https", hostname: "s3-ap-southeast-1.amazonaws.com" },
      { protocol: "https", hostname: "images.practo.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "maps.googleapis.com" }
    ]
  },
  async redirects() {
    return [
      {
        source: "/join",
        destination: "https://hanuonepro.vercel.app/register",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
