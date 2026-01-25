export const SERVICE_DEFINITIONS = [
  {
    id: 'discover',
    titleKey: 'services.cards.discoverTitle',
    descriptionKey: 'services.cards.discoverSubtitle',
    icon: 'book-open',
    colorKey: 'accentOrange',
    href: '/academies',
  },
  {
    id: 'portal',
    titleKey: 'services.cards.portalTitle',
    descriptionKey: 'services.cards.portalSubtitle',
    icon: 'user',
    colorKey: 'info',
    href: '/portal/(tabs)/home',
    requiresPlayer: true,
  },
  {
    id: 'playgrounds-explore',
    titleKey: 'services.cards.playgroundsTitle',
    descriptionKey: 'services.cards.playgroundsSubtitle',
    icon: 'activity',
    colorKey: 'success',
    href: '/playgrounds/explore',
  },
];

export const getAvailableServices = (session) => {
  const loginAs = session?.login_as || session?.user?.type || null;
  const isPlayer = loginAs === 'player';

  return SERVICE_DEFINITIONS.filter((service) => !service.requiresPlayer || isPlayer);
};
