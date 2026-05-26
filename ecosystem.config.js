require('dotenv').config({ path: '/opt/webchat/.env' });

module.exports = {
  apps: [
    {
      name: 'webchat-backend',
      script: 'java',
      args: '-jar /opt/webchat/webchat-backend.jar --spring.profiles.active=prod',
      interpreter: 'none',
      cwd: '/opt/webchat',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        DB_URL:       process.env.DB_URL,
        DB_USER:      process.env.DB_USER,
        DB_PASS:      process.env.DB_PASS,
        REDIS_HOST:   process.env.REDIS_HOST   || 'localhost',
        REDIS_PORT:   process.env.REDIS_PORT   || '6379',
        JWT_SECRET:   process.env.JWT_SECRET,
        CORS_ORIGINS: process.env.CORS_ORIGINS,
      },
      error_file: '/var/log/webchat/pm2-error.log',
      out_file:   '/var/log/webchat/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
