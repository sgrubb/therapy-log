export interface SetupSaveConfigParams {
  dbPath: string;
  createdByApp: boolean;
}

export interface ValidateDatabaseResult {
  valid: boolean;
  version: number;
}
