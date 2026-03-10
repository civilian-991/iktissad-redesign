/**
 * This route previously served the Stack Auth handler.
 * Stack Auth has been removed — redirect to the new login page.
 */
import { redirect } from 'next/navigation';

export default function LegacyStackHandlerPage() {
  redirect('/login');
}
