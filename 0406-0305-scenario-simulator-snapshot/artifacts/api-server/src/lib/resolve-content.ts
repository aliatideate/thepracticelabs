import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, workshopSessionsTable, workshopsTable } from "@workspace/db";

export {
  extractContentTokens,
  findUnresolvedTokens,
  prepareVariableValues,
  resolveContentTokens,
  resolveFacilitatorNotes,
  sanitiseFilenameSlug,
  validateTokenDeclarations,
  validateVariableValues,
  type VariableValidationError,
} from "./content-tokens";

/** Human join codes: no O/0/I/1/L. */
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateWorkshopCode(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET[bytes[i]! % CHARSET.length]!;
  }
  return out;
}

export async function allocateUniqueWorkshopCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateWorkshopCode();
    const [inWorkshops, inSessions] = await Promise.all([
      db
        .select({ id: workshopsTable.id })
        .from(workshopsTable)
        .where(eq(workshopsTable.code, code))
        .limit(1),
      db
        .select({ id: workshopSessionsTable.id })
        .from(workshopSessionsTable)
        .where(eq(workshopSessionsTable.workshopCode, code))
        .limit(1),
    ]);
    if (!inWorkshops[0] && !inSessions[0]) return code;
  }
  throw new Error("could not allocate workshop code");
}
