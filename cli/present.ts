#!/usr/bin/env npx tsx
// ── Present Agent CLI ───────────────────────────────────────────────
// Usage:
//   npx tsx cli/present.ts gift --for "Mom" --occasion birthday --budget "$50-100"
//   npx tsx cli/present.ts occasions --days 30
//   npx tsx cli/present.ts recipients

export {};

const BASE_URL = process.env.PRESENT_API_URL || "http://localhost:3000";

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  return res.json();
}

async function gift(args: string[]) {
  let recipient = "";
  let occasion = "";
  let budget = "";
  let interests = "";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--for": recipient = args[++i]; break;
      case "--occasion": occasion = args[++i]; break;
      case "--budget": budget = args[++i]; break;
      case "--interests": interests = args[++i]; break;
    }
  }

  if (!recipient) {
    console.error("Usage: present gift --for <name> [--occasion <type>] [--budget <range>] [--interests <comma-list>]");
    process.exit(1);
  }

  console.log(`\nFinding gifts for ${recipient}...`);

  const data = await api("/api/v1/gift", {
    method: "POST",
    body: JSON.stringify({ recipient, occasion, budget, interests }),
  });

  if (data.error) {
    console.error(`Error: ${data.error}`);
    process.exit(1);
  }

  console.log(`\nSession: ${data.sessionId}\n`);

  for (const rec of data.recommendations) {
    const slot = rec.slot === "top_pick" ? "TOP PICK" : rec.slot === "great_match" ? "GREAT MATCH" : "WILD CARD";
    console.log(`${slot} (${Math.round(rec.matchScore * 100)}% match)`);
    console.log(`  ${rec.name} by ${rec.brand} — $${rec.price}`);
    console.log(`  ${rec.whyThisFits}`);
    console.log(`  ${rec.buyUrl}`);
    console.log();
  }
}

async function occasions(args: string[]) {
  let days = 90;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--days") days = parseInt(args[++i]);
  }

  const data = await api(`/api/v1/occasions?days=${days}`);

  if (!data.occasions?.length) {
    console.log("No upcoming occasions found.");
    return;
  }

  console.log(`\nUpcoming occasions (next ${days} days):\n`);
  for (const occ of data.occasions) {
    const emoji = occ.type === "birthday" ? "🎂" : "📅";
    console.log(`  ${emoji} ${occ.name} — ${occ.type} — ${occ.date} (${occ.daysUntil}d)`);
  }
  console.log();
}

async function recipients() {
  const data = await api("/api/v1/recipients", {
    headers: { "x-user-id": "mcp-user" } as any,
  });

  if (!data.recipients?.length) {
    console.log("No saved recipients yet.");
    return;
  }

  console.log("\nYour people:\n");
  for (const r of data.recipients) {
    const interests = r.interests?.length ? ` — ${r.interests.join(", ")}` : "";
    console.log(`  ${r.name}${r.relationship ? ` (${r.relationship})` : ""}${interests}`);
  }
  console.log();
}

// Main
async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "gift": await gift(args); break;
    case "occasions": await occasions(args); break;
    case "recipients": await recipients(); break;
    default:
      console.log(`
Present Agent CLI

Usage:
  npx tsx cli/present.ts gift --for <name> [--occasion <type>] [--budget <range>]
  npx tsx cli/present.ts occasions [--days <n>]
  npx tsx cli/present.ts recipients
`);
  }
}

main().catch(console.error);
