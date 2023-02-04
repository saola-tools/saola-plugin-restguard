module.exports = {
  framework: {
    coupling: "loose",
    mode: "silent",
  },
  logger: {
    transports: {
      console: {
        type: "console",
        level: "info",
        json: false,
        timestamp: true,
        colorize: true
      }
    }
  }
};
