/** PM2 process file — run: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "linuxpro",
      cwd: "/var/www/linuxpro-website",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
