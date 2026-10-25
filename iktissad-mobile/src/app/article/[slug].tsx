import { useLocalSearchParams } from 'expo-router';

import { ArticleScreen } from '@/screens/article';

export default function Route() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <ArticleScreen slug={slug} />;
}
