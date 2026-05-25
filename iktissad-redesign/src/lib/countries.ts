/**
 * Shared country constants.
 *
 * Lives outside the route files because Next.js rejects non-handler exports
 * from `route.ts` ("not a valid Route export field").
 */

// Region buckets used for homepage grouping (see countries.region column).
export const COUNTRY_REGIONS = ["gulf", "mashreq", "northafrica", "world"] as const;

export type CountryRegion = (typeof COUNTRY_REGIONS)[number];
