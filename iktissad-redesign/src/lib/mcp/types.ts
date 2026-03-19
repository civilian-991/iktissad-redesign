/**
 * MCP (Model Context Protocol) Type Definitions
 *
 * JSON-RPC 2.0 based MCP protocol types for the IKTISSAD content server.
 */

export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

// ── MCP error codes (JSON-RPC 2.0) ───────────────────────────────────────────
export const MCP_ERRORS = {
  PARSE_ERROR:      { code: -32700, message: "Parse error" },
  METHOD_NOT_FOUND: { code: -32601, message: "Method not found" },
  INVALID_PARAMS:   { code: -32602, message: "Invalid params" },
  INTERNAL_ERROR:   { code: -32603, message: "Internal error" },
  UNAUTHORIZED:     { code: -32001, message: "Unauthorized" },
} as const;
