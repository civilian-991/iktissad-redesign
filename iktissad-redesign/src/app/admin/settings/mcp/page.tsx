/**
 * MCP Server Settings Page — Server Component
 *
 * Fetches existing API keys from Supabase and passes them to the client UI.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import MCPClient from "./MCPClient";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  created_at: string;
}

export const metadata = {
  title: "خادم MCP — لوحة التحكم",
};

export default async function MCPSettingsPage() {
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin.from("api_keys") as any)
    .select("id, name, key_prefix, scopes, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const apiKeys: ApiKeyRow[] = (rows ?? []) as ApiKeyRow[];

  return <MCPClient apiKeys={apiKeys} />;
}
