'use client';

import dynamic from 'next/dynamic';
import { openApiSpec } from '@/lib/openapi-spec';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function SwaggerClient() {
  return (
    <>
      {/* swagger-ui-react CSS */}
      { }
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-react@5/swagger-ui.css" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SwaggerUI spec={openApiSpec as Record<string, unknown>} />
      </div>
    </>
  );
}
