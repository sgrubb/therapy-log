import log from "electron-log/main";

log.transports.file.level = "info";
log.transports.console.level = "debug";

log.initialize();

export default log;
