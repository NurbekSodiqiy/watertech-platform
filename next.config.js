/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint is run separately via `npm run lint`; keeping it out of `next
    // build` avoids failing production builds on pre-existing lint findings
    // across the codebase that are out of scope for the ESLint setup itself.
    ignoreDuringBuilds: true,
  },
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
