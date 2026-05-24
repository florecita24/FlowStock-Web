import serverless from "serverless-http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "../server";

const app = createServer();
const handler = serverless(app);

// Vercel serverless function entry point
export default async function (req: IncomingMessage, res: ServerResponse) {
  return handler(req, res);
}
