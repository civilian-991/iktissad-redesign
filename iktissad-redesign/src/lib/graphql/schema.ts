/**
 * GraphQL Schema — IKTISSAD Public API
 *
 * Exports the SDL type definitions string used by createSchema() in graphql-yoga.
 */

export const typeDefs = /* GraphQL */ `
  type Article {
    id: ID!
    title: String!
    slug: String!
    excerpt: String
    content: String
    status: String!
    publishedAt: String
    featuredImage: String
    tags: [String!]!
    section: Section
    authorName: String
    readingTime: Int
    url: String!
  }

  type Section {
    id: ID!
    slug: String!
    name: String!
    nameEn: String
    description: String
  }

  type Sector {
    id: ID!
    slug: String!
    name: String!
    nameEn: String
    description: String
    icon: String
    color: String
  }

  type Series {
    id: ID!
    slug: String!
    title: String!
    titleEn: String
    description: String
    articleCount: Int!
    articles: [SeriesArticle!]!
  }

  type SeriesArticle {
    orderIndex: Int!
    title: String!
    slug: String!
    publishedAt: String
    url: String!
  }

  type ArticlesResult {
    data: [Article!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type Query {
    articles(page: Int, limit: Int, section: String, q: String): ArticlesResult!
    article(slug: String!): Article
    latestArticles(limit: Int, section: String): [Article!]!
    sections: [Section!]!
    sectors: [Sector!]!
    series: [Series!]!
    seriesBySlug(slug: String!): Series
    searchArticles(query: String!, limit: Int): [Article!]!
  }
`;
