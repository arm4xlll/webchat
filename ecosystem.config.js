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
      // Consider crashed if exits within 10 s of start
      min_uptime: '10s',
      // Exponential back-off between crash restarts (100 ms → doubles each time, cap 16 s)
      exp_backoff_restart_delay: 100,
      // Stop retrying after 15 quick crashes (prevents unrecoverable loop)
      max_restarts: 15,

      // ── Memory ─────────────────────────────────────────────────────
      // JVM: 512 MB heap + ~200 MB overhead → restart at 900 MB
      max_memory_restart: '900M',

      // ── Logs ────────────────────────────────────────────────────────
      error_file: '/var/log/webchat/pm2-error.log',
      out_file: '/var/log/webchat/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ── Environment ─────────────────────────────────────────────────
      // Env vars are injected at deploy time via `source .env` before
      // `pm2 startOrRestart --update-env`. PM2 then persists them in
      // ~/.pm2/dump.pm2 so crash-restarts and `pm2 resurrect` after
      // reboot all get the same values without re-sourcing .env.
      env: {
        NODE_ENV: 'production',
        // Java reads Spring env-vars, not Node env — these are passed
        // through to the JVM process environment as-is.
        DB_URL:      process.env.DB_URL      || '',
        DB_USER:     process.env.DB_USER     || '',
        DB_PASS:     process.env.DB_PASS     || '',
        REDIS_HOST:  process.env.REDIS_HOST  || 'localhost',
        REDIS_PORT:  process.env.REDIS_PORT  || '6379',
        JWT_SECRET:  process.env.JWT_SECRET  || '',
        CORS_ORIGINS: process.env.CORS_ORIGINS || '',
        VAPID_PUBLIC_KEY:  process.env.VAPID_PUBLIC_KEY  || '',
        VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
        VAPID_SUBJECT:     process.env.VAPID_SUBJECT     || '',
      },
    },
  ],
};
