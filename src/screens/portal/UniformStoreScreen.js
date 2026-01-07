import React, { memo, useState } from 'react';
import { View, ScrollView, FlatList, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PortalHeader, PortalSectionCard, PortalEmptyState, PortalSkeleton } from '../../components/portal';
import { useTranslation } from '../../i18n';
import { colors, spacing, formatCurrency } from '../../theme/portal.styles';

const UniformStoreScreen = memo(() => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('all');
  const isLoading = false; // Will be connected to hook

  const categories = [
    { id: 'all', label: t('portal.uniforms.categories.all') },
    { id: 'jerseys', label: t('portal.uniforms.categories.jerseys') },
    { id: 'shorts', label: t('portal.uniforms.categories.shorts') },
    { id: 'accessories', label: t('portal.uniforms.categories.accessories') },
  ];

  const renderCategories = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => setActiveCategory(category.id)}
            style={{
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              marginRight: spacing.sm,
              backgroundColor: activeCategory === category.id ? colors.primary : colors.backgroundElevated,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: activeCategory === category.id ? colors.primary : colors.borderMedium,
            }}
          >
            <Text style={{
              color: activeCategory === category.id ? colors.textInverted : colors.textPrimary,
              fontWeight: activeCategory === category.id ? '600' : '400',
            }}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderProducts = () => {
    if (isLoading) {
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: '48%', marginBottom: spacing.lg }}>
              <PortalSkeleton height={180} style={{ borderRadius: 12, marginBottom: spacing.sm }} />
              <PortalSkeleton height={20} style={{ borderRadius: 4, marginBottom: spacing.xs }} />
              <PortalSkeleton height={16} style={{ borderRadius: 4, width: '60%' }} />
            </View>
          ))}
        </View>
      );
    }

    return (
      <PortalEmptyState
        icon="shopping-bag"
        title={t('portal.uniforms.noProducts')}
        subtitle={t('portal.uniforms.noProductsSubtitle')}
      />
    );
  };

  const renderMyOrders = () => {
    return (
      <PortalSectionCard
        title={t('portal.uniforms.myOrders')}
        actionLabel={t('portal.uniforms.viewAll')}
        onAction={() => {/* Navigate to orders */}}
      >
        <PortalEmptyState
          icon="package"
          title={t('portal.uniforms.noOrders')}
          subtitle={t('portal.uniforms.noOrdersSubtitle')}
          compact
        />
      </PortalSectionCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <PortalHeader
        title={t('portal.uniforms.title')}
        subtitle={t('portal.uniforms.subtitle')}
        showCart={true}
        cartCount={0}
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding }}>
        {renderCategories()}
        {renderProducts()}
        {renderMyOrders()}
      </ScrollView>
    </SafeAreaView>
  );
});

UniformStoreScreen.displayName = 'UniformStoreScreen';

export default UniformStoreScreen;