import "dotenv/config";
import express, { Express, Request, Response } from "express";
import { ViteDevServer } from "vite";
import fs from "fs";
import path from "path";

let vite: ViteDevServer;

export async function setupVite(app: Express, server: any) {
  const { createServer } = await import("vite");

  vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  app.use(vite.middlewares);

  app.use("*", async (req: Request, res: Response) => {
    try {
      const url = req.originalUrl;
      let template = fs.readFileSync(
        path.resolve(import.meta.dirname, "../../client/index.html"),
        "utf-8"
      );
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e: any) {
      vite?.ssrFixStacktrace(e);
      console.log(e.stack);
      res.status(500).end(e.stack);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, serve from dist/public (the built client)
  // Use process.cwd() to get the project root directory
  const distPath = path.join(process.cwd(), "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA fallback)
  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
