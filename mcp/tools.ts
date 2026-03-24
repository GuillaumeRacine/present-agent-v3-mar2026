// ── MCP Tool Definitions ─────────────────────────────────────────────
// Tools exposed to Claude Code via the MCP protocol.

export const TOOLS = [
  {
    name: "present_find_gift",
    description: "Find gift recommendations for someone. Returns session ID and 3 product recommendations with card suggestion.",
    inputSchema: {
      type: "object" as const,
      properties: {
        recipient: { type: "string", description: "Name of the recipient" },
        relationship: { type: "string", description: "Relationship to recipient (e.g., mom, best friend, coworker)" },
        occasion: { type: "string", description: "Gift occasion (e.g., birthday, christmas, thank you)" },
        budget: { type: "string", description: "Budget range (e.g., '$50-100', 'under $50')" },
        interests: { type: "string", description: "Recipient interests, comma-separated" },
      },
      required: ["recipient"],
    },
  },
  {
    name: "present_occasions",
    description: "Get upcoming gift-relevant occasions from the user's calendar.",
    inputSchema: {
      type: "object" as const,
      properties: {
        daysAhead: { type: "number", description: "How many days ahead to look (default: 90)" },
      },
    },
  },
  {
    name: "present_recipient_profile",
    description: "Get a saved recipient's profile and gift history.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Name of the recipient to look up" },
      },
      required: ["name"],
    },
  },
  {
    name: "present_generate_card",
    description: "Generate a personalized gift card message for a session.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "Gift session ID" },
        customMessage: { type: "string", description: "Optional custom message to use instead of AI-generated" },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "present_mark_given",
    description: "Mark a gift as given and generate a recipient feedback link.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "Gift session ID to mark as given" },
      },
      required: ["sessionId"],
    },
  },
];
