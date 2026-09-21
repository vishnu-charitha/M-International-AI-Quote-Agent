import { db } from "@workspace/db";
import { rfqsTable, quotesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Synchronizing RFQ statuses...");
  const quotes = await db.select().from(quotesTable);
  for (const quote of quotes) {
    if (quote.rfqId) {
      await db.update(rfqsTable)
        .set({ status: "QUOTED" })
        .where(eq(rfqsTable.id, quote.rfqId));
      console.log(`Updated RFQ ID ${quote.rfqId} to QUOTED.`);
    }
  }
  console.log("Sync complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
