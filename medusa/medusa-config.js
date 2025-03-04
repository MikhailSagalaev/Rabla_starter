const { loadEnv, defineConfig } = require('@medusajs/framework/utils');

loadEnv(process.env.NODE_ENV, process.cwd());

module.exports = defineConfig({
  projectConfig: {
    database_type: "postgres",
    database_url: process.env.DATABASE_URL,
    store_cors: process.env.STORE_CORS,
    admin_cors: process.env.ADMIN_CORS,
    redis_url: process.env.REDIS_URL
  },
  plugins: [],
  modules: {
    eventBus: {
      resolve: "@medusajs/event-bus-local"
    }
  }
});
