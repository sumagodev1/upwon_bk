export interface Setting {
  key: string;
  value: unknown;
  description: string | null;
  isSensitive: boolean;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertSettingInput {
  key: string;
  value: unknown;
}
