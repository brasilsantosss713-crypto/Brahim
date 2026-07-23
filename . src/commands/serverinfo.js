const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder,
} = require('discord.js');
const store = require('../data/store');

const LEADERBOARD_PAGE_SIZE = 10;

function buildLeaderboardEmbed(sortedEntries, page, usernames) {
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / LEADERBOARD_PAGE_SIZE));
  const start = page * LEADERBOARD_PAGE_SIZE;
  const pageEntries = sortedEntries.slice(start, start + LEADERBOARD_PAGE_SIZE);

  const lines = pageEntries.map(([id, stats], i) => {
    const rank = start + i + 1;
    const points = (stats.closes + stats.renames) * 2;
    const name = usernames[id] || 'Unknown User';
    return `**#${rank} · @${name}** — \`${points} pts\`\n> ${stats.closes} closes · ${stats.renames} renames`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('Mod Leaderboard')
    .setDescription(lines.join('\n\n') || 'No mod actions logged yet.')
    .setFooter({ text: `Page ${page + 1}/${totalPages} · ${sortedEntries.length} staff ranked · mod actions` });

  return { embed, totalPages };
}

function buildLeaderboardRow(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`modlb_page_${page - 1}`).setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder().setCustomId(`modlb_page_${page + 1}`).setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
  );
}

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
      .setDescription('Close the current support ticket (also available as a button inside the ticket)'),
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

      await interaction.reply('🔒 Closing this ticket and generating a transcript...');
      await closeTicket(channel, interaction.user);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('ticketpanel')
      .setDescription('Post a ticket panel with a dropdown of categories')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post the panel in').setRequired(true).addChannelTypes(ChannelType.GuildText))
      .addStringOption(o => o.setName('name1').setDescription('Category 1 name').setRequired(true))
      .addStringOption(o => o.setName('desc1').setDescription('Category 1 description').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Panel title (default: "Tickets")'))
      .addStringOption(o => o.setName('intro').setDescription('Intro line (default: "Open a ticket below.")'))
      .addStringOption(o => o.setName('name2').setDescription('Category 2 name'))
      .addStringOption(o => o.setName('desc2').setDescription('Category 2 description'))
      .addStringOption(o => o.setName('name3').setDescription('Category 3 name'))
      .addStringOption(o => o.setName('desc3').setDescription('Category 3 description'))
      .addStringOption(o => o.setName('name4').setDescription('Category 4 name'))
      .addStringOption(o => o.setName('desc4').setDescription('Category 4 description'))
      .addStringOption(o => o.setName('name5').setDescription('Category 5 name'))
      .addStringOption(o => o.setName('desc5').setDescription('Category 5 description'))
      .addStringOption(o => o.setName('name6').setDescription('Category 6 name'))
      .addStringOption(o => o.setName('desc6').setDescription('Category 6 description'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title') || 'Tickets';
      const intro = interaction.options.getString('intro') || 'Open a ticket below.';

      const categories = [1, 2, 3, 4, 5, 6]
        .map(n => ({
          name: interaction.options.getString(`name${n}`),
          desc: interaction.options.getString(`desc${n}`),
        }))
        .filter(c => c.name && c.desc);

      const bodyLines = categories.map(c => `**${c.name}**\n${c.desc}`);
      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle(title)
        .setDescription(`${intro}\n\n${bodyLines.join('\n')}`);

      const select = new StringSelectMenuBuilder()
        .setCustomId('ticket_select')
        .setPlaceholder('Select a ticket type...')
        .addOptions(
          categories.map((c, i) => ({
            label: c.name.slice(0, 100),
            description: c.desc.slice(0, 100),
            value: `${i}`,
          }))
        );

      const row = new ActionRowBuilder().addComponents(select);

      const message = await channel.send({ embeds: [embed], components: [row] });

      const settings = store.getSettings(interaction.guild.id);
      settings.ticketPanels[message.id] = categories.map(c => ({ label: c.name }));
      store.setSettings(interaction.guild.id, settings);

      await interaction.reply({ content: `✅ Ticket panel posted in ${channel}.`, ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('modleaderboard')
      .setDescription('View the leaderboard of ticket actions (closes + renames) by staff'),
    async execute(interaction) {
      const allStats = store.getAllModStats();
      const sorted = Object.entries(allStats)
        .filter(([, s]) => s.closes > 0 || s.renames > 0)
        .sort((a, b) => (b[1].closes + b[1].renames) - (a[1].closes + a[1].renames));

      if (sorted.length === 0) {
        return interaction.reply('No mod actions logged yet.');
      }

      const usernames = {};
      await Promise.all(
        sorted.map(async ([id]) => {
          const user = await interaction.client.users.fetch(id).catch(() => null);
          usernames[id] = user ? user.username : null;
        })
      );

      const { embed, totalPages } = buildLeaderboardEmbed(sorted, 0, usernames);
      const row = buildLeaderboardRow(0, totalPages);

      await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    },
  },
];

// Shared helper — creates a private ticket channel for a user, optionally tagged with a category,
// and posts the welcome embed with Close/Claim buttons.
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
      `Thanks for reaching out, ${user}!\n\n**Category:** ${category}${reason ? `\n**Details:** ${reason}` : ''}\n\nA staff member will claim this shortly.`
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setEmoji('🙋').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );

  await channel.send({ content: `${user}`, embeds: [embed], components: [row] });
  return channel;
}

// Fetches up to 500 messages from a ticket channel and formats them into a plain-text transcript.
async function generateTranscript(channel) {
  let allMessages = [];
  let lastId;

  for (let i = 0; i < 5; i++) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId });
    if (batch.size === 0) break;
    allMessages = allMessages.concat(Array.from(batch.values()));
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  allMessages.reverse();

  const lines = allMessages.map(m => {
    const time = new Date(m.createdTimestamp).toISOString().replace('T', ' ').slice(0, 19);
    const attachments = m.attachments.size > 0 ? ` [attachments: ${m.attachments.map(a => a.url).join(', ')}]` : '';
    const content = m.content || (m.embeds.length > 0 ? '[embed]' : '');
    return `[${time}] ${m.author.tag}: ${content}${attachments}`;
  });

  const header = `Transcript for #${channel.name}\nGenerated: ${new Date().toISOString()}\n${'='.repeat(50)}\n\n`;
  return header + lines.join('\n');
}

// Closes a ticket: awards a mod stat, generates a transcript, sends it to the mod-log channel
// (falling back to DMing the ticket owner), then deletes the channel after a short delay.
async function closeTicket(channel, closedBy) {
  const guild = channel.guild;
  const settings = store.getSettings(guild.id);
  const ownerId = channel.topic?.split(':')[1];

  if (ownerId && closedBy.id !== ownerId) {
    store.addModAction(closedBy.id, 'close');
  }

  try {
    const transcriptText = await generateTranscript(channel);
    const attachment = new AttachmentBuilder(Buffer.from(transcriptText, 'utf-8'), { name: `${channel.name}-transcript.txt` });

    const embed = new EmbedBuilder()
      .setColor(0x95A5A6)
      .setTitle('📄 Ticket Transcript')
      .addFields(
        { name: 'Ticket', value: `#${channel.name}`, inline: true },
        { name: 'Closed By', value: closedBy.tag, inline: true },
      )
      .setTimestamp();

    const logChannel = settings.modLogChannelId ? guild.channels.cache.get(settings.modLogChannelId) : null;

    if (logChannel) {
      await logChannel.send({ embeds: [embed], files: [attachment] });
    } else if (ownerId) {
      const owner = await guild.client.users.fetch(ownerId).catch(() => null);
      if (owner) await owner.send({ embeds: [embed], files: [attachment] }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to generate/send transcript:', err);
  }

  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

module.exports.createTicketChannel = createTicketChannel;
module.exports.closeTicket = closeTicket;
module.exports.buildLeaderboardEmbed = buildLeaderboardEmbed;
module.exports.buildLeaderboardRow = buildLeaderboardRow;
