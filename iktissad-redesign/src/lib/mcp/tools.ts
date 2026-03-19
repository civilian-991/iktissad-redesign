/**
 * MCP Tools Definition
 *
 * Defines all tools exposed by the IKTISSAD MCP server.
 * Tool descriptions are in English (consumed by AI agents).
 * Article data is returned as-is (Arabic content).
 */

import type { MCPTool } from "./types";

export const MCP_TOOLS: MCPTool[] = [
  {
    name: "search_articles",
    description:
      "Search IKTISSAD Arabic financial news articles by keyword. Returns matching published articles with title, excerpt, section, and URL.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (Arabic or English keywords)",
        },
        section: {
          type: "string",
          description: "Filter by section slug (e.g. 'economy', 'markets'). Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10, max: 50)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_article",
    description:
      "Get full article content by slug. Returns the complete article including body text, author, tags, and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "Article slug identifier (URL-friendly string)",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "list_sections",
    description:
      "List all news sections / categories available on IKTISSAD (e.g. Economy, Markets, Banking, Real Estate).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_series",
    description:
      "List all investigative article series / dossiers published on IKTISSAD, with article counts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_series",
    description:
      "Get all articles belonging to a series in reading order, identified by series slug.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "Series slug identifier",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "get_latest_articles",
    description:
      "Get the latest published articles, optionally filtered by section. Useful for monitoring recent news.",
    inputSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          description: "Filter by section slug. Optional.",
        },
        limit: {
          type: "number",
          description: "Number of articles to return (default: 10, max: 50)",
        },
      },
    },
  },
  {
    name: "get_article_context",
    description:
      "Get contextual information for drafting content related to a topic. Returns related articles and the key sections that cover this topic — useful as background research before writing.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Topic or subject to research (Arabic or English)",
        },
      },
      required: ["topic"],
    },
  },
];
