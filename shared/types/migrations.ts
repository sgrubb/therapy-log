import { z } from "zod";
import { migrationInfoSchema } from "@shared/schemas/migrations";

export type MigrationInfo = z.infer<typeof migrationInfoSchema>;
