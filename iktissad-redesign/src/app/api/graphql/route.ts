/**
 * GraphQL API Route — /api/graphql
 *
 * Public GraphQL endpoint powered by graphql-yoga.
 * Every request requires a valid API key in the Authorization header.
 *
 * Auth: Bearer <api_key>
 * GraphiQL playground: only available in development
 */

import { createYoga, createSchema } from 'graphql-yoga';
import { typeDefs } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';
import { validateApiKey } from '@/lib/api-auth';

// ── CORS headers for API consumers ────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── Yoga instance ─────────────────────────────────────────────────────────────

const schema = createSchema({ typeDefs, resolvers });

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response, Request, Headers },
  graphiql: process.env.NODE_ENV === 'development',
  cors: false, // handled manually below
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function unauthorizedJson(message: string): Response {
  return new Response(
    JSON.stringify({ errors: [{ message }] }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
}

function addCors(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  // Allow GraphiQL browser navigation in development without API key auth
  const acceptHeader = request.headers.get('accept') ?? '';
  const isGraphiQLRequest =
    process.env.NODE_ENV === 'development' &&
    acceptHeader.includes('text/html');

  if (!isGraphiQLRequest) {
    const auth = await validateApiKey(request, { endpoint: '/api/graphql' });
    if (!auth.valid) return unauthorizedJson(auth.error ?? 'Unauthorized');
  }

  return addCors(await yoga.handleRequest(request, {}));
}

export async function POST(request: Request) {
  const auth = await validateApiKey(request, { endpoint: '/api/graphql' });
  if (!auth.valid) return unauthorizedJson(auth.error ?? 'Unauthorized');

  return addCors(await yoga.handleRequest(request, {}));
}
