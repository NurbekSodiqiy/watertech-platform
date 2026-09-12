/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/company/onboarding/call-operator",
        destination: "/company/onboarding",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
