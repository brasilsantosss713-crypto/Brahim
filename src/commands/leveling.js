const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
];

// Exported separately so index.js can hook this into messageCreate for passive XP gain.
module.exports.grantMessageXp = function grantMessageXp(userId) {
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
  return leveledUp ? data.level : null;
};
