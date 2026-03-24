#!/usr/bin/env node
// ── Present Agent MCP Server ────────────────────────────────────────
// Exposes gift-finding tools to Claude Code via the MCP protocol.
// Run: npx tsx mcp/server.ts

export {};

import { TOOLS } from "./tools";
import { getRecommendations, type GiftContext } from "../lib/recommend";
import { getUpcomingOccasions } from "../lib/occasions";
import { findRecipientByName, getRecipientHistory, buildRecipientBrief } from "../lib/profiles";
import { generateCard } from "../lib/cards";
import { createFeedbackToken } from "../lib/recipient-feedback";
import { getDb } from "../lib/db";
import * as readline from "readline";

const rl = readline.createInterface({ input: process.stdin });

function send(response: unknown) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

// Default user ID for MCP sessions (single-user local mode)
const DEFAULT_USER_ID = "mcp-user";

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "present_find_gift": {
      const context: GiftContext = {
        recipient: {
          name: args.recipient as string,
          relationship: (args.relationship as string) || undefined,
          interests: args.interests ? (args.interests as string).split(",").map(s => s.trim()) : undefined,
        },
        occasion: args.occasion ? { type: args.occasion as string } : undefined,
        gift: args.budget ? { budget: args.budget as string } : undefined,
      };

      const recs = await getRecommendations(context);
      return {
        recommendations: recs.map((r, i) => ({
          slot: i === 0 ? "Top Pick" : i === 1 ? "Great Match" : "Wild Card",
          name: r.product.name,
          brand: r.product.brand,
          price: r.product.price,
          category: r.product.category,
          matchScore: r.matchScore,
          whyThisFits: r.whyThisFits,
          buyUrl: r.product.buyUrl,
        })),
      };
    }

    case "present_occasions": {
      const days = (args.daysAhead as number) || 90;
      const occasions = await getUpcomingOccasions(days);
      return {
        occasions: occasions.slice(0, 20).map(o => ({
          name: o.personName,
          type: o.type,
          date: o.date,
          daysUntil: o.daysUntil,
          source: o.source,
        })),
      };
    }

    case "present_recipient_profile": {
      const name = args.name as string;
      const recipient = findRecipientByName(DEFAULT_USER_ID, name);
      if (!recipient) return { error: `No saved recipient named "${name}"` };

      const history = getRecipientHistory(recipient.id);
      const brief = buildRecipientBrief(recipient.id);
      return { recipient, history, brief };
    }

    case "present_generate_card": {
      const db = getDb();
      const session = db.prepare("SELECT * FROM gift_sessions WHERE id = ?")
        .get(args.sessionId as string) as any;
      if (!session) return { error: "Session not found" };

      const context = session.gift_context ? JSON.parse(session.gift_context) : {};
      const product = session.selected_product_data ? JSON.parse(session.selected_product_data) : { name: "Gift", brand: "", price: 0, category: "" };

      if (args.customMessage) {
        return { card: { message: args.customMessage, designTheme: "warm_minimal", toneMatch: "heartfelt" } };
      }

      const card = await generateCard(context, null, product);
      return { card };
    }

    case "present_mark_given": {
      const db = getDb();
      const session = db.prepare("SELECT * FROM gift_sessions WHERE id = ?")
        .get(args.sessionId as string) as any;
      if (!session) return { error: "Session not found" };

      const token = createFeedbackToken(args.sessionId as string);
      db.prepare("UPDATE gift_sessions SET status = 'delivered', updated_at = datetime('now') WHERE id = ?")
        .run(args.sessionId as string);

      return {
        status: "delivered",
        feedbackLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/feedback/${token}`,
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// MCP protocol handler
rl.on("line", async (line: string) => {
  try {
    const msg = JSON.parse(line);

    if (msg.method === "initialize") {
      send({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "present-agent", version: "0.1.0" },
        },
      });
    } else if (msg.method === "tools/list") {
      send({
        jsonrpc: "2.0",
        id: msg.id,
        result: { tools: TOOLS },
      });
    } else if (msg.method === "tools/call") {
      const result = await handleToolCall(msg.params.name, msg.params.arguments || {});
      send({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        },
      });
    } else {
      send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } });
    }
  } catch (error) {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: String(error) } });
  }
});
