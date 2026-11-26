import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  preview: {
    realtime: true,
  },
  auth: true,
  functions: {
    api: {
      name: "Nebula API",
      source: "./server/index.ts",
      env: {
        // Il secret di Realtime non viene iniettato automaticamente nelle
        // Functions: lo dichiariamo qui e lo passiamo con `neon deploy --env .env.local`.
        NEON_REALTIME_SECRET: {
          value: process.env.NEON_REALTIME_SECRET,
          required: true,
        },
        NEON_REALTIME_URL: {
          value: process.env.NEON_REALTIME_URL,
          required: true,
        },
      },
    },
  },
  buckets: {
    // Gli avatar e i media dei post devono essere leggibili dal browser.
    uploads: { access: "public_read" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
