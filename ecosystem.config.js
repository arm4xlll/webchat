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
      env_file: '/opt/webchat/.env',
      error_file: '/var/log/webchat/pm2-error.log',
      out_file:   '/var/log/webchat/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
