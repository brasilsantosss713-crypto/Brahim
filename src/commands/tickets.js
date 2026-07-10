const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

      const existing = guild.channels.cache.find(
        c => c.topic && c.topic.startsWith(`ticket-owner:${user.id}`) && c.type === ChannelType.GuildText
      );
      if (existing) {
        return interaction.reply({ content: `You already have an open ticket: ${existing}`, ephemeral: true });
      }

      const channel = await createTicketChannel(guild, user, 'General', reason);
      await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('closeticket')
      .setDescription('Close the current support ticket'),
    async execute(interaction) {
      const channel = interaction.channel;

      if (!channel.topic || !channel.topic.startsWith('ticket-owner:')) {
        return interaction.reply({ content: 'This command only works inside a ticket channel.', ephemeral: true });
      }

      const ownerId = channel.topic.split(':')[1];
      const isOwner = interaction.user.id === ownerId;
      const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

      if (!isOwner && !isStaff) {
        return interaction.reply({ content: "You don't have permission to close this ticket.", ephemeral: true });
      }

      await interaction.reply('🔒 Closing this ticket in 5 seconds...');
      setTimeout(() => channel.delete().catch(() => {}), 5000);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('ticketpanel')
      .setDescription('Post a ticket panel with category buttons (like a support hub)')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post the panel in').setRequired(true).addChannelTypes(ChannelType.GuildText))
      .addStringOption(o => o.setName('title').setDescription('Panel title, e.g. "Open a Ticket"').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Full description text — explain each category here').setRequired(true))
      .addStringOption(o => o.setName('label1').setDescription('Category 1 button label').setRequired(true))
      .addStringOption(o => o.setName('emoji1').setDescription('Category 1 emoji'))
      .addStringOption(o => o.setName('label2').setDescription('Category 2 button label'))
      .addStringOption(o => o.setName('emoji2').setDescription('Category 2 emoji'))
      .addStringOption(o => o.setName('label3').setDescription('Category 3 button label'))
      .addStringOption(o => o.setName('emoji3').setDescription('Category 3 emoji'))
      .addStringOption(o => o.setName('label4').setDescription('Category 4 button label'))
      .addStringOption(o => o.setName('emoji4').setDescription('Category 4 emoji'))
      .addStringOption(o => o.setName('label5').setDescription('Category 5 button label'))
      .addStringOption(o => o.setName('emoji5').setDescription('Category 5 emoji'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');

      const categories = [1, 2, 3, 4, 5]
        .map(n => ({
          label: interaction.options.getString(`label${n}`),
          emoji: interaction.options.getString(`emoji${n}`),
        }))
        .filter(c => c.label);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(description);

      const buttons = categories.map((c, i) => {
        const btn = new ButtonBuilder()
          .setCustomId(`ticket_open_${i}`)
          .setLabel(c.label)
          .setStyle([ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary][i % 4]);
        if (c.emoji) btn.setEmoji(c.emoji);
        return btn;
      });

      // Discord allows max 5 buttons per row.
      const row = new ActionRowBuilder().addComponents(buttons);

      const message = await channel.send({ embeds: [embed], components: [row] });

      const settings = store.getSettings(interaction.guild.id);
      settings.ticketPanels[message.id] = categories;
      store.setSettings(interaction.guild.id, settings);

      await interaction.reply({ content: `✅ Ticket panel posted in ${channel}.`, ephemeral: true });
    },
  },
];

// Shared helper — creates a private ticket channel for a user, optionally tagged with a category.
async function createTicketChannel(guild, user, category, reason) {
  const settings = store.getSettings(guild.id);

  const overwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
  ];

  if (settings.hierarchy.length > 0) {
    const topRole = settings.hierarchy[settings.hierarchy.length - 1];
    overwrites.push({ id: topRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
  }

  const channel = await guild.channels.create({
    name: `ticket-${user.username}`.toLowerCase().slice(0, 90),
    type: ChannelType.GuildText,
    topic: `ticket-owner:${user.id}:${category}`,
    permissionOverwrites: overwrites,
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🎫 ${category} Ticket`)
    .setDescription(
      `Thanks for reaching out, ${user}!\n\n**Category:** ${category}${reason ? `\n**Details:** ${reason}` : ''}\n\nA staff member will be with you shortly. Use \`/closeticket\` when this is resolved.`
    )
    .setTimestamp();

  await channel.send({ content: `${user}`, embeds: [embed] });
  return channel;
}

module.exports.createTicketChannel = createTicketChannel;
