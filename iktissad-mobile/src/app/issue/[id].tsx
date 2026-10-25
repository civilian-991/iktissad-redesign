import { useLocalSearchParams } from 'expo-router';

import { IssueReaderScreen } from '@/screens/issue-reader';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <IssueReaderScreen id={id} />;
}
