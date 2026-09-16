import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AnimatedPressable, Card, EmptyState, ListCardSkeleton, Refresher } from '@/components';
import { useCampaigns } from '@/queries/campaigns';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDate } from '@/utils/format';

export default function CampaignsScreen() {
  const router = useRouter();
  const { data: campaigns, isLoading, isRefetching, refetch } = useCampaigns();

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            hitSlop={10}
            haptic="tap"
            onPress={() => router.back()}
            style={styles.headerButton}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Kampanyalar</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.list}>
          <ListCardSkeleton />
          <ListCardSkeleton />
          <ListCardSkeleton />
        </View>
      ) : !campaigns || campaigns.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="pricetag-outline"
            title="Şu an aktif kampanya yok"
            description="Yeni kampanyalar eklendiğinde burada görünecek."
          />
        </View>
      ) : (
        <Animated.ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<Refresher refreshing={isRefetching} onRefresh={refetch} />}>
          {campaigns.map((campaign, index) => (
            <Animated.View key={campaign.id} entering={FadeInDown.delay(index * 60).duration(280)}>
              <Card style={styles.card}>
                <View style={styles.badge}>
                  <Ionicons name="pricetag" size={14} color={colors.primaryText} />
                  <Text style={styles.badgeText}>{campaign.discountLabel}</Text>
                </View>
                <Text style={styles.title}>{campaign.title}</Text>
                <Text style={styles.description}>{campaign.description}</Text>
                {!!campaign.validUntil && (
                  <Text style={styles.validUntil}>
                    {formatDate(campaign.validUntil)} tarihine kadar geçerli
                  </Text>
                )}
              </Card>
            </Animated.View>
          ))}
        </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.h3, color: colors.text },
  headerSpacer: { width: 40, height: 40 },

  emptyWrap: { flex: 1, justifyContent: 'center' },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },

  card: { marginBottom: spacing.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.badge,
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    ...typography.captionStrong,
    color: colors.primaryText,
    marginLeft: spacing.xs,
  },
  title: { ...typography.h3, color: colors.text, marginTop: spacing.md },
  description: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  validUntil: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.md },
});
