import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import PortalHeader from '../../components/portal/PortalHeader';
import PortalCard from '../../components/portal/PortalCard';
import PortalListItem from '../../components/portal/PortalListItem';
import { usePortalAuthState } from '../../services/portal/portal.hooks';

export default function PortalProfileScreen() {
  const { player, logout } = usePortalAuthState();
  const playerName = player?.fullName || player?.name || 'Player Profile';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PortalHeader title="Profile" subtitle={playerName} />

        <PortalCard title="Account" subtitle="Manage your personal details">
          <View style={styles.listStack}>
            <PortalListItem icon="user" label="Personal details" value="Edit profile info" />
            <PortalListItem icon="shield" label="Security" value="Reset password" />
            <PortalListItem icon="bell" label="Notifications" value="Manage alerts" />
          </View>
        </PortalCard>

        <PortalCard title="Support" subtitle="Need a hand?">
          <View style={styles.listStack}>
            <PortalListItem icon="message-circle" label="Contact academy" value="Reach your coordinator" />
            <PortalListItem icon="help-circle" label="Help center" value="FAQs and guides" />
          </View>
        </PortalCard>

        <PortalCard title="Session" subtitle="Sign out when you are done">
          <PortalListItem
            icon="log-out"
            label="Log out"
            value="End this session"
            onPress={() => logout()}
            tone="danger"
          />
          <Text style={styles.caption}>You can always log back in with your academy credentials.</Text>
        </PortalCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F5FA',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  listStack: {
    gap: 12,
  },
  caption: {
    marginTop: 10,
    fontSize: 12,
    color: '#9A99AE',
  },
});
