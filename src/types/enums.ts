export const FormState = {
  Idle: "idle",
  Saving: "saving",
  Error: "error",
} as const;
export type FormState = (typeof FormState)[keyof typeof FormState];
