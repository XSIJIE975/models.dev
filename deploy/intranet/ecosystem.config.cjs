module.exports = {
  apps: [
    {
      name: "models-dev",
      cwd: "/home/xsijie/workspaces/models-dev",
      script: "bun",
      args: "run intranet:serve",
      interpreter: "none",
      env: {
        HOST: "127.0.0.1",
        PORT: "3000",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      out_file: "/var/log/models-dev/out.log",
      error_file: "/var/log/models-dev/error.log",
      time: true,
    },
  ],
};
