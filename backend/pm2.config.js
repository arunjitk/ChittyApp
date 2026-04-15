// PM2 process manager config — run with: npx pm2 start pm2.config.js
//
// Why PM2?  `node server.js` dies on an uncaught crash and stays dead.
// PM2 restarts it automatically, logs to a persistent file, and keeps
// the process alive across SSH disconnects.
//
// Quick start:
//   cd backend
//   npx pm2 start pm2.config.js
//   npx pm2 logs chitty-backend     # live log tail
//   npx pm2 status                  # health overview
//   npx pm2 stop chitty-backend     # stop
//   npx pm2 delete chitty-backend   # remove from PM2

module.exports = {
  apps: [
    {
      name: 'chitty-backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,            // set true in dev if you want file-watch restarts
      max_restarts: 10,        // stop restart loop if crashing repeatedly
      restart_delay: 2000,     // wait 2 s before restarting (prevents CPU spin)
      max_memory_restart: '512M',

      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Log rotation — keeps log files from growing unbounded
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
    },
  ],
};
