const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deleteallchannels')
    .setDescription('Deletes every channel in this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({
      content: '🗑️ Deleting all channels...',
      ephemeral: true,
    });

    const channels = interaction.guild.channels.cache;

    for (const channel of channels.values()) {
      try {
        await channel.delete('Deleted using /deleteallchannels');
      } catch (err) {
        console.error(`Couldn't delete ${channel.name}:`, err);
      }
    }
  },
};
