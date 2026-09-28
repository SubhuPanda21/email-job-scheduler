import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env";
import { htmlToPreview } from "../utils/render";

const plain = (d: { body: string }) => ({ ...d, body: htmlToPreview(d.body, 5000) });

export const esClient = new Client({ node: env.esUrl });

export interface EmailDoc {
  id: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  senderEmail: string;
  status: string;
  scheduledAt: Date;
  sentAt: Date | null;
}

export async function ensureIndex() {
  if (await esClient.indices.exists({ index: env.esIndex })) return;
  await esClient.indices.create({
    index: env.esIndex,
    mappings: {
      properties: {
        userId: { type: "keyword" },
        recipient: { type: "text", fields: { raw: { type: "keyword" } } },
        subject: { type: "text" },
        body: { type: "text" },
        senderEmail: { type: "keyword" },
        status: { type: "keyword" },
        scheduledAt: { type: "date" },
        sentAt: { type: "date" },
      },
    },
  });
}

export async function indexEmail(doc: EmailDoc) {
  await esClient.index({ index: env.esIndex, id: doc.id, document: plain(doc) });
}

export async function bulkIndex(docs: EmailDoc[]) {
  if (!docs.length) return;
  const operations = docs.flatMap((d) => [{ index: { _index: env.esIndex, _id: d.id } }, plain(d)]);
  const res = await esClient.bulk({ operations });
  if (res.errors) console.error("[es] some bulk items failed");
}

export async function searchEmails(query: string, userId: string, status?: string) {
  const filter: object[] = [{ term: { userId } }];
  if (status) filter.push({ term: { status } });
  const result = await esClient.search({
    index: env.esIndex,
    size: 50,
    query: {
      bool: {
        filter,
        must: [{ multi_match: { query, fields: ["subject^2", "body", "recipient"], fuzziness: "AUTO" } }],
      },
    },
    sort: [{ scheduledAt: "desc" }],
  });
  return result.hits.hits.map((h) => h._source);
}
