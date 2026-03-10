/**
 * Subscribe Not Found — redirects to /subscribe
 * IKTISSAD Design System
 */

import { redirect } from 'next/navigation';

export default function SubscribeNotFound() {
  redirect('/subscribe');
}
