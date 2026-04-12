import type { Metadata } from 'next';
import SwaggerClient from './SwaggerClient';

export const metadata: Metadata = {
  title: 'API Documentation | IKTISSAD',
  description: 'Interactive API documentation for the IKTISSAD platform',
  robots: { index: false, follow: false },
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SwaggerClient />
    </div>
  );
}
