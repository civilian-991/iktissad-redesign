/**
 * OpenAPI 3.0 specification for IKTISSAD API
 *
 * Covers the most-used route groups:
 * - Articles (public + admin CRUD)
 * - Auth (session, CSRF, Turnstile)
 * - Admin (roles, calendar, settings)
 * - Subscriptions & newsletters
 * - AI services
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'IKTISSAD API',
    version: '1.0.0',
    description:
      'Public and internal API for the IKTISSAD (الإقتصاد والأعمال) Arabic financial news platform. All write operations require authentication via Supabase session cookie or API key.',
    contact: {
      name: 'IKTISSAD Dev Team',
      url: 'https://www.iktissadonline.com',
    },
  },
  servers: [
    {
      url: 'https://www.iktissadonline.com',
      description: 'Production',
    },
    {
      url: 'http://localhost:3000',
      description: 'Local development',
    },
  ],
  tags: [
    { name: 'Articles', description: 'Public article read + admin CRUD' },
    { name: 'Auth', description: 'Authentication and session management' },
    { name: 'Admin', description: 'Administrative operations' },
    { name: 'Subscriptions', description: 'Subscriber management' },
    { name: 'Newsletters', description: 'Newsletter CRUD and sending' },
    { name: 'AI', description: 'AI-powered content tools' },
    { name: 'Media', description: 'Media library management' },
    { name: 'Search', description: 'Full-text and semantic search' },
    { name: 'Social', description: 'Social media auto-posting' },
    { name: 'Archival', description: 'Content expiry and archival' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'sb-access-token',
        description: 'Supabase session cookie (set after login)',
      },
      csrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description: 'CSRF token required for all mutations',
      },
      bearerApiKey: {
        type: 'http',
        scheme: 'bearer',
        description: 'Public API key for external integrations',
      },
    },
    schemas: {
      ApiError: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Not found' },
        },
        required: ['error'],
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 150 },
          totalPages: { type: 'integer', example: 15 },
        },
      },
      Article: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string', example: 'saudi-gdp-growth-2026' },
          title: { type: 'string', example: 'نمو الناتج المحلي السعودي' },
          titleEn: { type: 'string', example: 'Saudi GDP Growth 2026' },
          excerpt: { type: 'string' },
          excerptEn: { type: 'string' },
          content: { type: 'string', description: 'HTML body' },
          featuredImage: { type: 'string', format: 'uri' },
          status: {
            type: 'string',
            enum: ['published', 'draft', 'review', 'scheduled'],
          },
          articleType: {
            type: 'string',
            enum: ['news', 'report', 'analysis', 'interview', 'opinion'],
          },
          tags: { type: 'array', items: { type: 'string' } },
          views: { type: 'integer' },
          featured: { type: 'boolean' },
          editorChoice: { type: 'boolean' },
          isBreaking: { type: 'boolean' },
          isPaywalled: { type: 'boolean' },
          publishedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          author: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              avatar: { type: 'string', format: 'uri' },
            },
          },
          section: {
            type: 'object',
            properties: {
              slug: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
      ArticleCreate: {
        type: 'object',
        required: ['title', 'slug'],
        properties: {
          title: { type: 'string', minLength: 1 },
          slug: { type: 'string', minLength: 1 },
          titleEn: { type: 'string', default: '' },
          excerpt: { type: 'string', default: '' },
          excerptEn: { type: 'string', default: '' },
          content: { type: 'string', default: '' },
          contentEn: { type: 'string', default: '' },
          body: { oneOf: [{ type: 'string' }, { type: 'object' }, { type: 'array' }] },
          featuredImage: { type: 'string', default: '' },
          sectionSlug: { type: 'string' },
          sectorSlug: { type: 'string' },
          countrySlug: { type: 'string' },
          authorId: { type: 'string', format: 'uuid' },
          tags: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['published', 'draft', 'review', 'scheduled'], default: 'draft' },
          publishedAt: { type: 'string', format: 'date-time' },
          featured: { type: 'boolean' },
          editorChoice: { type: 'boolean' },
          isBreaking: { type: 'boolean' },
          paywalled: { type: 'boolean' },
          articleType: { type: 'string', enum: ['news', 'report', 'analysis', 'interview', 'opinion'] },
          metaTitle: { type: 'string', maxLength: 120 },
          metaDescription: { type: 'string', maxLength: 320 },
          ogImage: { type: 'string', format: 'uri' },
          canonicalUrl: { type: 'string', format: 'uri' },
          noIndex: { type: 'boolean' },
          autoPost: { type: 'boolean', default: true },
        },
      },
      Subscriber: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          planId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['trialing', 'active', 'past_due', 'canceled', 'paused', 'incomplete'] },
          currentPeriodStart: { type: 'string', format: 'date-time' },
          currentPeriodEnd: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Newsletter: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          subject: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'scheduled', 'sent'] },
          sentAt: { type: 'string', format: 'date-time' },
          recipientCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      SocialAccount: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          platform: { type: 'string', enum: ['twitter', 'linkedin', 'telegram'] },
          accountName: { type: 'string' },
          active: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/api/articles': {
      get: {
        tags: ['Articles'],
        summary: 'List articles with filtering and pagination',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'section', in: 'query', schema: { type: 'string' }, description: 'Section slug' },
          { name: 'sector', in: 'query', schema: { type: 'string' }, description: 'Sector slug' },
          { name: 'country', in: 'query', schema: { type: 'string' }, description: 'Country slug' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['published', 'draft', 'review', 'scheduled'] } },
          { name: 'featured', in: 'query', schema: { type: 'boolean' } },
          { name: 'editorChoice', in: 'query', schema: { type: 'boolean' } },
          { name: 'breaking', in: 'query', schema: { type: 'boolean' } },
          { name: 'tag', in: 'query', schema: { type: 'string' } },
          { name: 'authorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'iLIKE search on title' },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['date', 'views', 'title'] } },
          { name: 'includeArchived', in: 'query', schema: { type: 'boolean', default: false } },
        ],
        responses: {
          '200': {
            description: 'Paginated article list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Article' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          '429': { description: 'Rate limited', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
      post: {
        tags: ['Articles'],
        summary: 'Create a new article',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ArticleCreate' } } },
        },
        responses: {
          '201': { description: 'Article created', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Article' } } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '401': { description: 'Unauthenticated' },
        },
      },
    },
    '/api/articles/{id}': {
      get: {
        tags: ['Articles'],
        summary: 'Get single article by UUID or slug',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Article UUID or slug' },
        ],
        responses: {
          '200': { description: 'Article detail', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Article' } } } } } },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Articles'],
        summary: 'Update an article',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ArticleCreate' } } },
        },
        responses: {
          '200': { description: 'Article updated' },
          '401': { description: 'Unauthenticated' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Articles'],
        summary: 'Delete an article',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Article deleted' },
          '401': { description: 'Unauthenticated' },
        },
      },
    },
    '/api/articles/{id}/apple-news': {
      get: {
        tags: ['Articles'],
        summary: 'Export article in Apple News JSON format',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Article UUID or slug' },
        ],
        responses: {
          '200': { description: 'Apple News JSON document', content: { 'application/json': { schema: { type: 'object' } } } },
          '404': { description: 'Article not found' },
        },
      },
    },
    '/api/auth/csrf': {
      get: {
        tags: ['Auth'],
        summary: 'Get CSRF token',
        description: 'Returns a CSRF token and sets a cookie. Token must be sent as X-CSRF-Token header on all mutations.',
        responses: {
          '200': { description: 'CSRF token', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' } } } } } },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user session',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Current user', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' } } } } } } } },
          '401': { description: 'Not authenticated' },
        },
      },
    },
    '/api/search': {
      get: {
        tags: ['Search'],
        summary: 'Full-text + semantic search across articles',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'section', in: 'query', schema: { type: 'string' } },
          { name: 'sector', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Search results', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Article' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } },
        },
      },
    },
    '/api/subscriptions': {
      get: {
        tags: ['Subscriptions'],
        summary: 'List subscription plans',
        responses: {
          '200': { description: 'Available plans' },
        },
      },
      post: {
        tags: ['Subscriptions'],
        summary: 'Create a new subscription',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { planId: { type: 'string', format: 'uuid' } }, required: ['planId'] } } } },
        responses: {
          '201': { description: 'Subscription created' },
          '401': { description: 'Unauthenticated' },
        },
      },
    },
    '/api/newsletters': {
      get: {
        tags: ['Newsletters'],
        summary: 'List newsletters (admin)',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'scheduled', 'sent'] } },
        ],
        responses: {
          '200': { description: 'Newsletter list' },
        },
      },
      post: {
        tags: ['Newsletters'],
        summary: 'Create a newsletter',
        security: [{ cookieAuth: [], csrfToken: [] }],
        responses: {
          '201': { description: 'Newsletter created' },
        },
      },
    },
    '/api/newsletters/{id}/send': {
      post: {
        tags: ['Newsletters'],
        summary: 'Send a newsletter',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Newsletter sent' },
          '404': { description: 'Newsletter not found' },
        },
      },
    },
    '/api/ai/social-content': {
      post: {
        tags: ['AI'],
        summary: 'Generate social media post copy for an article',
        security: [{ cookieAuth: [] }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { articleId: { type: 'string', format: 'uuid' }, platforms: { type: 'array', items: { type: 'string' } } }, required: ['articleId', 'platforms'] } } },
        },
        responses: {
          '200': { description: 'Generated posts', content: { 'application/json': { schema: { type: 'object', properties: { posts: { type: 'object', additionalProperties: { type: 'string' } } } } } } },
        },
      },
    },
    '/api/ai/summarize': {
      post: {
        tags: ['AI'],
        summary: 'Generate article summary (AR + EN) and persist',
        security: [{ cookieAuth: [] }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { articleId: { type: 'string' }, content: { type: 'string' }, title: { type: 'string' } }, required: ['articleId', 'content', 'title'] } } },
        },
        responses: {
          '200': { description: 'Summary generated', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { summary: { type: 'string' }, summaryEn: { type: 'string' } } } } } } } },
        },
      },
    },
    '/api/admin/social-accounts': {
      get: {
        tags: ['Social'],
        summary: 'List connected social media accounts',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Social accounts list', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/SocialAccount' } } } } } } },
        },
      },
      post: {
        tags: ['Social'],
        summary: 'Connect a social media account',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { platform: { type: 'string', enum: ['twitter', 'linkedin', 'telegram'] }, accessToken: { type: 'string' }, accountName: { type: 'string' } }, required: ['platform', 'accessToken', 'accountName'] } } },
        },
        responses: {
          '201': { description: 'Account connected' },
        },
      },
    },
    '/api/admin/social/post': {
      post: {
        tags: ['Social'],
        summary: 'Manually trigger social media post for an article',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { articleId: { type: 'string', format: 'uuid' }, platforms: { type: 'array', items: { type: 'string' } } }, required: ['articleId'] } } },
        },
        responses: {
          '200': { description: 'Posts sent', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } } } } } },
        },
      },
    },
    '/api/admin/archival/run': {
      post: {
        tags: ['Archival'],
        summary: 'Trigger content archival for articles older than threshold',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { thresholdDays: { type: 'integer', default: 730, description: 'Articles older than this many days are archived' } } } } },
        },
        responses: {
          '200': { description: 'Archival results', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { archivedCount: { type: 'integer' }, threshold: { type: 'string' } } } } } } } },
        },
      },
    },
    '/api/media': {
      get: {
        tags: ['Media'],
        summary: 'List media library',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'folder', in: 'query', schema: { type: 'string' } },
          { name: 'mimeType', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Media list' },
        },
      },
      post: {
        tags: ['Media'],
        summary: 'Upload a media file',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: {
          '201': { description: 'Media uploaded' },
        },
      },
    },
    '/api/feed.xml': {
      get: {
        tags: ['Articles'],
        summary: 'RSS feed (latest 50 published articles)',
        responses: {
          '200': { description: 'RSS XML feed', content: { 'application/xml': {} } },
        },
      },
    },
    '/api/admin/roles': {
      get: {
        tags: ['Admin'],
        summary: 'List admin users with roles',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Admin users list' },
        },
      },
    },
  },
} as const;
