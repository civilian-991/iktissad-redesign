import { redirect } from 'next/navigation';

export default function SourcesNewPage() {
  // Sources are created via modal on the list page
  redirect('/admin/sources');
}
