/**
 * MCP (Model Context Protocol) Route Handler
 *
 * Implements MCP JSON-RPC 2.0 over HTTP POST.
 * Authenticated via SHA-256 hashed API keys stored in the api_keys table.
 *
 * Supported methods:
 *   tools/list  — returns all available MCP tools
 *   tools/call  — executes a named tool with arguments
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { MCP_TOOLS } from "@/lib/mcp/tools";
import { handleToolCall } from "@/lib/mcp/handler";
import type { MCPRequest, MCPResponse } from "@/lib/mcp/types";
import { MCP_ERRORS } from "@/lib/mcp/types";

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Validate a Bearer API key against the api_keys table.
 * Returns the key row on success, null on failure.
 */
async function validateApiKey(rawKey: string): Promise<{ id: string; scopes: string[] } | null> {
  if (!rawKey) return null;

  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from("api_keys") as any)
    .select("id, scopes, is_active, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !data) return null;

  const row = data as {
    id: string;
    scopes: string[];
    is_active: boolean;
    expires_at: string | null;
  };

  if (!row.is_active) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;

  // Update last_used_at asynchronously (fire-and-forget)
  void (admin.from("api_keys") as any)
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { id: row.id, scopes: row.scopes ?? [] };
}

// ── Response helpers ──────────────────────────────────────────────────────────

function mcpOk(id: string | number, result: unknown): NextResponse {
  const body: MCPResponse = { jsonrpc: "2.0", id, result };
  return NextResponse.json(body, {
    headers: { "Content-Type": "application/json" },
  });
}

function mcpError(id: string | number | null, code: number, message: string): NextResponse {
  const body: MCPResponse = {
    jsonrpc: "2.0",
    id: id ?? 0,
    error: { code, message },
  };
  return NextResponse.json(body, {
    status: code === MCP_ERRORS.UNAUTHORIZED.code ? 401 : 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Parse request body ────────────────────────────────────────────────
  let mcpReq: MCPRequest;
  try {
    mcpReq = (await request.json()) as MCPRequest;
  } catch {
    return mcpError(null, MCP_ERRORS.PARSE_ERROR.code, MCP_ERRORS.PARSE_ERROR.message);
  }

  const reqId = mcpReq.id ?? 0;

  // ── 2. Authenticate via Bearer token ─────────────────────────────────────
  const authHeader = request.headers.get("Authorization") ?? "";
  const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  const keyRecord = await validateApiKey(rawKey);
  if (!keyRecord) {
    return mcpError(reqId, MCP_ERRORS.UNAUTHORIZED.code, MCP_ERRORS.UNAUTHORIZED.message);
  }

  // ── 3. Dispatch method ────────────────────────────────────────────────────
  const { method, params } = mcpReq;

  if (method === "tools/list") {
    return mcpOk(reqId, { tools: MCP_TOOLS });
  }

  if (method === "tools/call") {
    const p = (typeof params === "object" && params !== null ? params : {}) as Record<string, unknown>;
    const toolName = typeof p.name === "string" ? p.name : "";
    const toolArgs = typeof p.arguments === "object" && p.arguments !== null ? p.arguments : {};

    if (!toolName) {
      return mcpError(reqId, MCP_ERRORS.INVALID_PARAMS.code, "Missing tool name in params.name");
    }

    // Verify the tool exists
    const toolDef = MCP_TOOLS.find((t) => t.name === toolName);
    if (!toolDef) {
      return mcpError(
        reqId,
        MCP_ERRORS.METHOD_NOT_FOUND.code,
        `Unknown tool: ${toolName}`
      );
    }

    const result = await handleToolCall(toolName, toolArgs);
    return mcpOk(reqId, result);
  }

  return mcpError(reqId, MCP_ERRORS.METHOD_NOT_FOUND.code, `Method not found: ${method}`);
}

// MCP is a POST-only endpoint; reject other methods gracefully
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      service: "IKTISSAD MCP Server",
      version: "1.0",
      protocol: "MCP JSON-RPC 2.0",
      note: "Send POST requests with Authorization: Bearer <api_key>",
    },
    { status: 200 }
  );
}
