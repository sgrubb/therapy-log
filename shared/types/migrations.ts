export interface MigrationInfo {
  currentVersion: number;
  requiredVersion: number;
  createdByApp: boolean;
}
