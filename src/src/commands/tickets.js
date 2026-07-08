const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const store = require('../data/store');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('ticket')
      .setDescription('Open a private support ticket')
      .addStringOption(o => o.setName('reason').setDescription('What do you need help with?').setRequired(true)),
    async execute(interaction) {
      const guild = interaction.guild;
      const user = interaction.user;
      const reason = interaction.options.getString('reason');

      const settings = store.getSettings(guild.id);

      // Prevent a user from having more than one open ticket at a time.
      const existing = guild.channels.cache.find(
        c => c.topic === `ticket-owner:${user.id}` && c.type === ChannelType.GuildText
      );
      if (existing) {
        return interaction.reply({ content: `You already have an open ticket: ${existing}`, ephemeral: true });
      }

      const overwrites = [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
      ];

      // If a staff/support role is configured, give it access too.
      if (settings.hierarchy.length > 0) {
        const topRole = settings.hierarchy[settings.hierarchy.length - 1];
        overwrites.push({ id: topRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
      }

      const channel = await guild.channels.create({
        name: `ticket-${user.username}`.toLowerCase().slice(0, 90),
        type: ChannelType.GuildText,
        topic: `ticket-owner:${user.id}`,
        permissionOverwrites: overwrites,
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎫 Support Ticket')
        .setDescription(`Thanks for reachi
