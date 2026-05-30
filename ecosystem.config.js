module.exports = {
  apps: [
    {
      name: 'webchat-backend',
      script: 'java',
      args: '-Xms256m -Xmx512m -jar /opt/webchat/webchat-backend.jar --spring.profiles.active=prod',
      interpreter: 'none',
      cwd: '/opt/webchat',
      instances: 1,

      // ── Restart policy ──────────────────────────────────────────────
      autorestart: true,
      watch: false,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100,
      max_restarts: 15,

      // ── Memory ─────────────────────────────────────────────────────
      max_memory_restart: '900M',

      // ── Logs ────────────────────────────────────────────────────────
      error_file: '/var/log/webchat/pm2-error.log',
      out_file: '/var/log/webchat/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ── Environment ─────────────────────────────────────────────────
      env: {
        NODE_ENV: 'production',
        DB_URL:             process.env.DB_URL             || '',
        DB_USER:            process.env.DB_USER            || '',
        DB_PASS:            process.env.DB_PASS            || '',
        REDIS_HOST:         process.env.REDIS_HOST         || 'localhost',
        REDIS_PORT:         process.env.REDIS_PORT         || '6379',
        JWT_SECRET:         process.env.JWT_SECRET         || '',
        CORS_ORIGINS:       process.env.CORS_ORIGINS       || '',
        VAPID_PUBLIC_KEY:   process.env.VAPID_PUBLIC_KEY   || '',
        VAPID_PRIVATE_KEY:  process.env.VAPID_PRIVATE_KEY  || '',
        VAPID_SUBJECT:      process.env.VAPID_SUBJECT      || '',
        LIVEKIT_URL:        process.env.LIVEKIT_URL        || '',
        LIVEKIT_API_KEY:    process.env.LIVEKIT_API_KEY    || '',
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '',
      },
    },

    {
      name: 'livekit',
      script: '/usr/local/bin/livekit-server',
      args: '--config /etc/livekit/livekit.yaml',
      interpreter: 'none',
      cwd: '/etc/livekit',
      instances: 1,

      autorestart: true,
      watch: false,
      min_uptime: '5s',
      exp_backoff_restart_delay: 100,
      max_restarts: 15,

      error_file: '/var/log/webchat/livekit-error.log',
      out_file: '/var/log/webchat/livekit-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      env: { NODE_ENV: 'production' },
    },
  ],
};
