const DEFAULT_SETTINGS = {
  mutedRoleId: null,
  welcomeChannelId: null,
  welcomeMessage: 'Welcome {user} to {server}! 🎉',
  goodbyeChannelId: null,
  goodbyeMessage: '{user} has left {server}. 👋',
  modLogChannelId: null,
  automod: { enabled: false, bannedWords: [] },
  hierarchy: [], // ordered array of role IDs, lowest first, for /promote and /demote
  reactionRoles: {}, // messageId -> { emoji: roleId }
  rules: '',
  faq: [], // { question, answer }
  socials: [], // { platform, url }
  affiliates: [], // { name, url }
  suggestionsChannelId: null,
  verifyRoleId: null,
  security: {
    inviteGuard: false,
    webhookGuard: false,
    joinGuard: false,
    minAccountAgeDays: 7,
  },
  leveling: {
    enabled: false,
    announceChannelId: null, // null = announce in the channel where the message was sent
    levelRoles: {}, // level (as string) -> roleId
  },
  ticketPanels: {}, // messageId -> [{ label, emoji, style }]
};
