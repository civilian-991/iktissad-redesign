import { redirect } from 'next/navigation';

/**
 * GET /subscribe/return
 *
 * MPGS Hosted Checkout return URL.
 * After the customer completes (or cancels) payment, MPGS redirects here with:
 *   ?resultIndicator=<string>  — present only on successful completion
 *   &sessionVersion=<string>   — MPGS internal
 *
 * We don't verify resultIndicator vs successIndicator here because the webhook
 * is the authoritative source of truth for subscription activation.
 * This page just routes the user to the right destination.
 */
export default async function SubscribeReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ resultIndicator?: string; order?: string }>;
}) {
  const params = await searchParams;
  const { resultIndicator, order } = params;

  if (resultIndicator) {
    // Payment flow completed — redirect to success page
    const successUrl = order
      ? `/subscribe/success?order=${encodeURIComponent(order)}`
      : '/subscribe/success';
    redirect(successUrl);
  }

  // No resultIndicator — user cancelled or navigated away
  redirect('/subscribe?error=cancelled');
}
