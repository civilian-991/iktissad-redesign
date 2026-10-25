import { NativeTabs } from 'expo-router/native-tabs';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { t } from '@/lib/strings';
import { brand } from '@/theme';

export const unstable_settings = { initialRouteName: '(home)' };

const TABS = [
  { name: '(home)', label: t.tabs.home, sf: { default: 'newspaper', selected: 'newspaper.fill' }, md: 'newspaper' },
  { name: '(sections)', label: t.tabs.sections, sf: { default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }, md: 'grid_view' },
  { name: '(magazine)', label: t.tabs.magazine, sf: { default: 'book', selected: 'book.fill' }, md: 'menu_book' },
  { name: '(more)', label: t.tabs.more, sf: { default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' }, md: 'more_horiz' },
] as const;

// Installed builds are Arabic-only, so iOS/Android lay the native tab bar out
// right-to-left. Expo Go runs in the phone's language and never mirrors its
// tab bar, so there the order is reversed by hand to keep الرئيسية on the right.
const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const ORDERED = IN_EXPO_GO ? [...TABS].reverse() : TABS;

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={brand.blue} minimizeBehavior="onScrollDown">
      {ORDERED.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
      <NativeTabs.Trigger name="(search)" role="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>{t.tabs.search}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
