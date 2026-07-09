const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const store = require('../data/store');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('reminder')
      .setDescription('Create and manage reminders')
      .addSubcommand(sub =>
        sub.setName('create').setDescription('Create a new reminder')
          .addIntegerOption(o => o.setName('minutes').setDescription('Minutes from now').setRequired(true))
          .addStringOption(o => o.setName('message').setDescription('What to remind about').setRequired(true))
          .addUserOption(o => o.setName('user').setDescription('Remind someone else instead of yourself'))
      )
      .addSubcommand(sub => sub.setName('list').setDescription('View your pending reminders'))
      .addSubcommand(sub =>
        sub.setName('cancel').setDescription('Cancel a reminder')
          .addIntegerOption(o => o.setName('id').setDescription('The reminder ID (see /reminder list)').setRequired(true))
      ),
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();

      if (sub === 'create') {
        const minutes = interaction.options.getInteger('minutes');
        const message = interaction.options.getString('message');
        const targetUser = interaction.options.getUser('user') || interaction.user;

        if (minutes <= 0 || minutes > 60 * 24 * 30) {
          return interaction.reply({ content: 'Please choose between 1 minute and 30 days.', ephemeral: true });
        }

        const remindAt = Date.now() + minutes * 60 * 1000;
        const reminder = store.addReminder({
          userId: targetUser.id,
          createdBy: interaction.user.id,
          channelId: interaction.channel.id,
          message,
          remindAt,
        });

        const who = targetUser.id === interaction.user.id ? 'you' : targetUser.username;
        await interaction.reply(
          `⏰ Reminder #${reminder.id} set for ${who} <t:${Math.floor(remindAt / 1000)}:R>: "${message}"`
        );
      }

      if (sub === 'list') {
        const reminders = store.getRemindersForUser(interaction.user.id);
        if (reminders.length === 0) {
          return interaction.reply({ content: "You don't have any pending reminders.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('⏰ Your Reminders')
          .setDescription(
            reminders
              .sort((a, b) => a.remindAt - b.remindAt)
              .map(r => `**#${r.id}** <t:${Math.floor(r.remindAt / 1000)}:R> — ${r.message}`)
              .join('\n')
          );
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (sub === 'cancel') {
        const id = interaction.options.getInteger('id');
        const reminders = store.getRemindersForUser(interaction.user.id);
        const match = reminders.find(r => r.id === id);

        if (!match) {
          return interaction.reply({ content: "That reminder wasn't found (or isn't yours).", ephemeral: true });
        }

        store.removeReminder(id);
        await interaction.reply({ content: `✅ Cancelled reminder #${id}.`, ephemeral: true });
      }
    },
  },
];
