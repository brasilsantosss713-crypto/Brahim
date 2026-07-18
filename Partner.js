const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const store = require('../data/store');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('partnerpoints')
      .setDescription('Manage partner points — a separate currency for rewarding partners')
      .addSubcommand(sub =>
        sub.setName('give').setDescription('Give partner points to a user')
          .addUserOption(o => o.setName('user').setDescription('Who to give points to').setRequired(true))
          .addIntegerOption(o => o.setName('amount').setDescription('Amount to give').setRequired(true))
      )
      .addSubcommand(sub =>
        sub.setName('take').setDescription('Remove partner points from a user')
          .addUserOption(o => o.setName('user').setDescription('Who to take points from').setRequired(true))
          .addIntegerOption(o => o.setName('amount').setDescription('Amount to remove').setRequired(true))
      )
      .addSubcommand(sub =>
        sub.setName('balance').setDescription("Check a user's partner points balance")
          .addUserOption(o => o.setName('user').setDescription('Whose balance to check (default: you)'))
      )
      .addSubcommand(sub => sub.setName('leaderboard').setDescription('View the partner points leaderboard')),
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();

      if (sub === 'give' || sub === 'take') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: "You don't have permission to manage partner points.", ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        if (amount <= 0) {
          return interaction.reply({ content: 'Amount must be positive.', ephemeral: true });
        }

        const current = store.getPartnerPoints(user.id);
        const updated = sub === 'give' ? current + amount : Math.max(0, current - amount);
        store.setPartnerPoints(user.id, updated);

        return interaction.reply(
          `✅ ${sub === 'give' ? 'Gave' : 'Took'} **${amount}** partner point(s) ${sub === 'give' ? 'to' : 'from'} **${user.username}**. New balance: ${updated}`
        );
      }

      if (sub === 'balance') {
        const user = interaction.options.getUser('user') || interaction.user;
        const balance = store.getPartnerPoints(user.id);
        return interaction.reply(`🤝 **${user.username}** has **${balance}** partner point(s).`);
      }

      if (sub === 'leaderboard') {
        const all = store.getAllPartnerPoints();
        const sorted = Object.entries(all)
          .filter(([, amount]) => amount > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        if (sorted.length === 0) {
          return interaction.reply('No partner points have been awarded yet.');
        }

        const lines = await Promise.all(
          sorted.map(async ([id, amount], i) => {
            const user = await interaction.client.users.fetch(id).catch(() => null);
            return `**${i + 1}.** ${user ? user.username : 'Unknown User'} — ${amount} point(s)`;
          })
        );

        const embed = new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle('🤝 Partner Points Leaderboard')
          .setDescription(lines.join('\n'));
        return interaction.reply({ embeds: [embed] });
      }
    },
  },
];
