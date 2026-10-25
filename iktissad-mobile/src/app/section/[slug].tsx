import { useLocalSearchParams } from 'expo-router';

import { SectionScreen } from '@/screens/section';

export default function Route() {
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>();
  return <SectionScreen slug={slug} initialTitle={name} />;
}
