const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const store = require('../data/store');

function xpForLevel(level) {
  return 5 * (level ** 2) + 50 * level + 100;
}

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('rank')
      .setDescription('View your current level and XP')
      .addUserOption(o => o.setName('user').setDescription("Check someone else's rank")),
    async execute(interaction) {
      const target = interaction.options.getUser('user') || interaction.user;
      const data = store.getLevel(target.id);
      const needed = xpForLevel(data.level);

      const embed = new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle(`📈 ${target.username}'s Rank`)
        .addFields(
          { name: 'Level', value: `${data.level}`, inline: true },
          { name: 'XP', value: `${data.xp} / ${needed}`, inline: true },
        );
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription("View the server's XP leaderboard"),
    async execute(interaction) {
      const all = store.getAllLevels();
      const sorted = Object.entries(all)
        .sort((a, b) => (b[1].level - a[1].level) || (b[1].xp - a[1].xp))
        .slice(0, 10);

      if (sorted.length === 0) {
        return interaction.reply('No leveling data yet — start chatting to earn XP!');
      }

      const lines = await Promise.all(
        sorted.map(async ([id, data], i) => {
          const user = await interaction.client.users.fetch(id).catch(() => null);
          const name = user ? user.username : 'Unknown User';
          return `**${i + 1}.** ${name} — Level ${data.level} (${data.xp} XP)`;
        })
      );

      const embed = new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle('🏆 XP Leaderboard')
        .setDescription(lines.join('\n'));
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('leveling')
      .setDescription('Enable/disable leveling and manage level-up roles')
      .addSubcommand(sub => sub.setName('enable').setDescription('Turn on the leveling system for this server'))
      .addSubcommand(sub => sub.setName('disable').setDescription('Turn off the leveling system for this server'))
      .addSubcommand(sub =>
        sub.setName('channel').setDescription('Set the channel for level-up announcements (omit to announce in the same channel as the message)')
          .addChannelOption(o => o.setName('channel').setDescription('Announcement channel'))
      )
      .addSubcommand(sub =>
        sub.setName('addrole').setDescription('Award a role when a member reaches a level')
          .addIntegerOption(o => o.setName('level').setDescription('The level required').setRequired(true))
          .addRoleOption(o => o.setName('role').setDescription('The role to award').setRequired(true))
      )
      .addSubcommand(sub =>
        sub.setName('removerole').setDescription('Remove a level-up role reward')
          .addIntegerOption(o => o.setName('level').setDescription('The level to clear').setRequired(true))
      )
      .addSubcommand(sub => sub.setName('listroles').setDescription('List all configured level-up roles'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();
      const settings = store.getSettings(interaction.guild.id);

      if (sub === 'enable') {
        settings.leveling.enabled = true;
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply('✅ Leveling system enabled. Members now earn XP by chatting.');
      }

      if (sub === 'disable') {
        settings.leveling.enabled = false;
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply('✅ Leveling system disabled.');
      }

      if (sub === 'channel') {
        const channel = interaction.options.getChannel('channel');
        settings.leveling.announceChannelId = channel ? channel.id : null;
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply(
          channel ? `✅ Level-up announcements will post in ${channel}.` : '✅ Level-up announcements will post in whichever channel the message was sent in.'
        );
      }

      if (sub === 'addrole') {
        const level = interaction.options.getInteger('level');
        const role = interaction.options.getRole('role');
        settings.leveling.levelRoles[level] = role.id;
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply(`✅ Members will receive **${role.name}** upon reaching level ${level}.`);
      }

      if (sub === 'removerole') {
        const level = interaction.options.getInteger('level');
        delete settings.leveling.levelRoles[level];
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply(`✅ Removed the level-up role reward for level ${level}.`);
      }

      if (sub === 'listroles') {
        const entries = Object.entries(settings.leveling.levelRoles);
        if (entries.length === 0) return interaction.reply('No level-up roles configured yet.');

        const lines = entries
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([level, roleId]) => `Level ${level} → <@&${roleId}>`);
        return interaction.reply(lines.join('\n'));
      }
    },
  },
];

// Exported separately so index.js can hook this into messageCreate for passive XP gain.
// Returns null if nothing happened, or { level, roleId, announceChannelId } on level-up.
module.exports.grantMessageXp = function grantMessageXp(userId, guildId) {
  const settings = store.getSettings(guildId);
  if (!settings.leveling.enabled) return null;

  const data = store.getLevel(userId);
  const now = Date.now();

  // 60 second cooldown between XP gains to prevent spam farming
  if (now - data.lastMessage < 60 * 1000) return null;

  const gained = Math.floor(Math.random() * 11) + 15; // 15-25 XP per message
  data.xp += gained;
  data.lastMessage = now;

  const needed = xpForLevel(data.level);
  let leveledUp = false;
  if (data.xp >= needed) {
    data.xp -= needed;
    data.level += 1;
    leveledUp = true;
  }

  store.setLevel(userId, data);
  if (!leveledUp) return null;

  return {
    level: data.level,
    roleId: settings.leveling.levelRoles[data.level] || null,
    announceChannelId: settings.leveling.announceChannelId || null,
  };
};
