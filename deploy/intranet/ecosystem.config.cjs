module.exports = {
  apps: [
    {
      name: "models-dev-mirror",
      cwd: "/opt/models-dev-mirror",
      script: "pnpm",
      args: "run intranet:serve",
      env: {
        PORT: "3000",
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,
      out_file: "/var/log/models-dev-mirror/out.log",
      error_file: "/var/log/models-dev-mirror/error.log",
      merge_logs: true,
      time: true,
      pid_file: '/var/run/models-dev-mirror.pid',
      cron_restart: '0 4 * * *',
      exp_backoff_restart_delay: 100,
      instances: 1,
      exec_mode: 'cluster',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M'
    },
  ],
};
