export const SERVICE_DEFINITIONS = [
  {
    id: 'discover',
    titleKey: 'home.discoverCard.title',
    descriptionKey: 'home.discoverCard.description',
    icon: 'compass',
    colorKey: 'accentOrange',
    href: '/academies',
  },
  {
    id: 'portal',
    titleKey: 'home.portalCard.title',
    descriptionKey: 'home.portalCard.description',
    icon: 'user',
    colorKey: 'info',
    href: '/portal/home',
    requiresPlayer: true,
  },
  {
    id: 'playgrounds-explore',
    titleKey: 'home.playgrounds.explore.title',
    descriptionKey: 'home.playgrounds.explore.description',
    icon: 'map',
    colorKey: 'success',
    href: '/playgrounds/explore',
  },
];

export const getAvailableServices = (session) => {
  const loginAs = session?.login_as || session?.user?.type || null;
  const isPlayer = loginAs === 'player';

  return SERVICE_DEFINITIONS.filter((service) => !service.requiresPlayer || isPlayer);
};
