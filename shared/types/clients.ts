import { z } from "zod";
import {
  clientSchema,
  clientWithTherapistSchema,
  clientCreateSchema,
  clientUpdateSchema,
  clientCloseSchema,
  clientReopenSchema,
  clientListParamsSchema,
} from "@shared/schemas/clients";

export type Client = z.infer<typeof clientSchema>;
export type ClientWithTherapist = z.infer<typeof clientWithTherapistSchema>;
export type CreateClient = z.infer<typeof clientCreateSchema>;
export type UpdateClient = z.infer<typeof clientUpdateSchema>;
export type CloseClient = z.infer<typeof clientCloseSchema>;
export type ReopenClient = z.infer<typeof clientReopenSchema>;
export type ClientListParams = z.infer<typeof clientListParamsSchema>;
