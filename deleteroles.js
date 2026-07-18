const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deleteroles')
    .setDescription('Deletes all roles that the bot can delete.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ You need Administrator permission.',
        ephemeral: true
      });
    }

    await interaction.reply('⚠️ Deleting roles...');

    const roles = interaction.guild.roles.cache;

    let deleted = 0;

    for (const role of roles.values()) {
      // Cannot delete @everyone or roles higher than the bot
      if (
        role.id !== interaction.guild.id &&
        role.position < interaction.guild.members.me.roles.highest.position
      ) {
        try {
          await role.delete('Deleted by /deleteroles command');
          deleted++;
        } catch (err) {
          console.log(`Failed to delete ${role.name}:`, err.message);
        }
      }
    }

    interaction.editReply(`✅ Deleted ${deleted} roles.`);
  }
};
