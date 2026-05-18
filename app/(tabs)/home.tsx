import { router } from 'expo-router';
import { Text, View } from 'react-native';

import {
  AppCard,
  AppScreen,
  EmptyState,
  LoadingState,
  QuickActionCard,
  ScreenHeader,
  StatCard,
} from '../../src/components';
import { useAuth } from '../../src/features/auth';
import { useDogs } from '../../src/features/dogs';
import { useCurrentKennel } from '../../src/features/kennels';
import { useLitters } from '../../src/features/litters';
import { useUnreadNotificationsCount } from '../../src/features/notifications';

const quickActions = [
  {
    body: 'Open the dog form for the active kennel.',
    href: '/dogs?action=create',
    label: 'D',
    title: 'Add Dog',
  },
  {
    body: 'Create a planned, expected or born litter.',
    href: '/litters?action=create',
    label: 'L',
    title: 'Add Litter',
  },
  {
    body: 'Review and update registered dogs.',
    href: '/dogs',
    label: 'DR',
    title: 'Dogs',
  },
  {
    body: 'Manage litters and parent links.',
    href: '/litters',
    label: 'LR',
    title: 'Litters',
  },
] as const;

const nextSteps = [
  { description: 'Puppy pipeline, litter status and placement notes.', status: 'Coming soon', title: 'Puppies' },
  { description: 'Client contact history and placement preferences.', status: 'Next', title: 'Clients' },
  { description: 'Bookings, deposits and reservation follow-up.', status: 'Next', title: 'Reservations' },
] as const;

export default function HomeScreen() {
  const { profile, profileError } = useAuth();
  const { currentKennel, currentMembership, isKennelLoading, kennelError } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const dogsQuery = useDogs(kennelId);
  const littersQuery = useLitters(kennelId);
  const unreadNotificationsQuery = useUnreadNotificationsCount(kennelId);
  const dogs = dogsQuery.data ?? [];
  const litters = littersQuery.data ?? [];
  const unreadCount = unreadNotificationsQuery.data ?? 0;
  const hasKennel = Boolean(currentKennel);
  const isRegistryLoading = isKennelLoading || dogsQuery.isLoading || littersQuery.isLoading;
  const firstError =
    profileError ??
    kennelError ??
    getErrorMessage(dogsQuery.error) ??
    getErrorMessage(littersQuery.error) ??
    getErrorMessage(unreadNotificationsQuery.error);

  return (
    <AppScreen scrollable>
      <ScreenHeader
        eyebrow="Amidog"
        title="Home"
        subtitle={
          profile?.email
            ? `Signed in as ${profile.email}`
            : 'A focused workspace for managing kennel records and daily operations.'
        }
      />

      {isKennelLoading ? <LoadingState title="Loading kennel" message="Preparing your active workspace." /> : null}

      {!isKennelLoading && !hasKennel ? (
        <EmptyState
          title="No active kennel"
          message="Create or select a kennel before managing dogs, litters and documents."
          actionLabel="Open profile"
          onAction={() => router.push('/(tabs)/profile' as never)}
        />
      ) : null}

      {firstError ? (
        <AppCard title="Needs attention" className="border-red-100 bg-red-50">
          <Text className="text-sm leading-5 text-red-600">{firstError}</Text>
        </AppCard>
      ) : null}

      {hasKennel ? (
        <>
          <AppCard className="border-brand-700 bg-brand-700">
            <View className="gap-4">
              <View className="gap-1">
                <Text className="text-xs font-semibold uppercase text-brand-100">Active kennel</Text>
                <Text className="text-2xl font-bold text-white">{currentKennel?.name}</Text>
                <Text className="text-sm capitalize text-brand-100">
                  {currentMembership?.role ?? 'member'} workspace
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <StatusPill label={`${unreadCount} unread`} />
                <StatusPill label={isRegistryLoading ? 'Syncing' : 'Up to date'} />
              </View>
            </View>
          </AppCard>

          <View className="gap-3">
            <SectionTitle title="Quick stats" />
            <View className="flex-row flex-wrap gap-3">
              <StatCard
                label="Dogs"
                value={dogs.length}
                helper={dogs.length === 0 ? 'No dogs yet' : 'Registered dogs'}
                loading={dogsQuery.isLoading}
                tone="brand"
              />
              <StatCard
                label="Litters"
                value={litters.length}
                helper={litters.length === 0 ? 'No litters yet' : 'Active registry'}
                loading={littersQuery.isLoading}
                tone="accent"
              />
              <StatCard label="Puppies" value="Soon" helper="Coming soon" tone="neutral" />
            </View>
          </View>

          <View className="gap-3">
            <SectionTitle title="Quick actions" />
            <View className="flex-row flex-wrap gap-3">
              {quickActions.map((action) => (
                <QuickActionCard
                  body={action.body}
                  className="min-w-[150px]"
                  key={action.href}
                  label={action.label}
                  title={action.title}
                  onPress={() => router.push(action.href as never)}
                />
              ))}
            </View>
          </View>

          {!isRegistryLoading && !dogsQuery.error && !littersQuery.error && dogs.length === 0 && litters.length === 0 ? (
            <EmptyState
              title="Start the kennel registry"
              message="Add the first dog or litter to turn this workspace into a daily dashboard."
              actionLabel="Add dog"
              onAction={() => router.push('/dogs?action=create' as never)}
            />
          ) : null}

          <AppCard title="Next steps" subtitle="Upcoming workflows for a complete breeder operation.">
            <View className="gap-4">
              {nextSteps.map((step, index) => (
                <View
                  className={`gap-1 ${index === 0 ? '' : 'border-t border-border pt-4'}`}
                  key={step.title}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-base font-semibold text-ink">{step.title}</Text>
                    <Text className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      {step.status}
                    </Text>
                  </View>
                  <Text className="text-sm leading-5 text-muted">{step.description}</Text>
                </View>
              ))}
            </View>
          </AppCard>
        </>
      ) : null}
    </AppScreen>
  );
}

interface SectionTitleProps {
  title: string;
}

function SectionTitle({ title }: SectionTitleProps) {
  return <Text className="text-lg font-semibold text-ink">{title}</Text>;
}

interface StatusPillProps {
  label: string;
}

function StatusPill({ label }: StatusPillProps) {
  return (
    <View className="rounded-full bg-white/15 px-3 py-1">
      <Text className="text-xs font-semibold text-white">{label}</Text>
    </View>
  );
}

function getErrorMessage(error: unknown) {
  if (!error) {
    return null;
  }

  return error instanceof Error ? error.message : 'Something went wrong while loading dashboard data.';
}
