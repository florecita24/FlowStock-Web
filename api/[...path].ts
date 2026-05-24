import serverless from "serverless-http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "../server";

const app = createServer();
const handler = serverless(app);

// Vercel catch-all serverless function for /api/*
export default async function (req: IncomingMessage, res: ServerResponse) {
  return handler(req, res);
}
