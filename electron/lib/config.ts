import { app } from "electron";

export const IS_DEV = !app.isPackaged;
export const IS_PROD = app.isPackaged;

export function getAppVersion(): string {
  return app.getVersion();
}
