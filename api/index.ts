import "dotenv/config";
import serverless from "serverless-http";
import { createServer } from "../server";

const app = createServer();

// Wrap Express app as a Vercel serverless function
export default serverless(app);
