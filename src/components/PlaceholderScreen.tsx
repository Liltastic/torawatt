import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createThemedStyles, spacing, typography } from '@/theme';

import { EmptyState } from './EmptyState';

/** Henuz yapilmamis sekmeler icin ortak iskelet. Ekran gerceklendikce silinecek. */
export function PlaceholderScreen({
  title,
  icon,
  headline,
  description,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  headline: string;
  description: string;
}) {
  const styles = useStyles();
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>
        <EmptyState icon={icon} title={headline} description={description} />
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  title: { ...typography.h2, color: colors.text },
  body: { flex: 1, justifyContent: 'center' },
}));
