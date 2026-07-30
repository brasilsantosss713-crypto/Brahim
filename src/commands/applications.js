const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');

const PANEL_TITLE = '✨ Want to join the team? ✨';
const PANEL_INTRO = "We're looking for active, trusted, and dedicated members to help our community grow and shine! 💫";

const PANEL_DESCRIPTION = `${PANEL_INTRO}

🛡️ **Ticket Staff Application**
Help moderate chats, handle tickets, support members, answer questions, and keep the server safe, friendly, and organized ✨
Requirements: 50M+ networth and 10M+ weekly activity

🤝 **Partner Manager Application**
Help grow our network by finding new partnerships, managing partner requests, and bringing in 20+ partners every week 🌸
Requirement: 5+ server partnership experience

🏗️ **Builder Application**
Create amazing bases, farms, stashes, and custom builds while following requests and delivering high-quality work 🧱💖
Requirement: 100M+ networth

📋 **General Requirements**
• Must be 14+
• Must be active, kind, and respectful
• Must communicate well
• Must handle situations maturely
• Must be trusted within the community

⚠️ **Important**
• No fake applications
• No trolling or unserious answers
• Toxicity, scamming, leaking, or inactivity may result in removal

Good luck, and thank you for wanting to join the team!! 💕✨`;

const CATEGORIES = {
  staff: {
    label: 'Ticket Staff',
    modalTitle: 'Ticket Staff Application',
    fields: [
      { key: 'age', label: 'Your age', style: TextInputStyle.Short, required: true },
      { key: 'networth', label: 'Your networth (min 50M)', style: TextInputStyle.Short, required: true },
      { key: 'activity', label: 'Weekly activity (min 10M)', style: TextInputStyle.Short, required: true },
      { key: 'experience', label: 'Relevant experience (if any)', style: TextInputStyle.Paragraph, required: false },
      { key: 'why', label: 'Why should we pick you?', style: TextInputStyle.Paragraph, required: true },
    ],
  },
  partner: {
    label: 'Partner Manager',
    modalTitle: 'Partner Manager Application',
    fields: [
      { key: 'age', label: 'Your age', style: TextInputStyle.Short, required: true },
      { key: 'experience', label: 'Your 5+ partnership experience', style: TextInputStyle.Paragraph, required: true },
      { key: 'weekly_partners', label: 'Partners you can bring weekly', style: TextInputStyle.Short, required: true },
      { key: 'why', label: 'Why should we pick you?', style: TextInputStyle.Paragraph, required: true },
    ],
  },
  builder: {
    label: 'Builder',
    modalTitle: 'Builder Application',
    fields: [
      { key: 'age', label: 'Your age', style: TextInputStyle.Short, required: true },
      { key: 'networth', label: 'Your networth (min 100M)', style: TextInputStyle.Short, required: true },
      { key: 'portfolio', label: 'Links to your build portfolio', style: TextInputStyle.Paragraph, required: true },
      { key: 'why', label: 'Why should we pick you?', style: TextInputStyle.Paragraph, required: true },
    ],
  },
};

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('postapplications')
      .setDescription('Post the staff/partner/builder application panel in a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (defaults to this channel)').addChannelTypes(ChannelType.GuildText))
      .addChannelOption(o => o.setName('review_channel').setDescription('Channel where submitted applications get reviewed (defaults to this channel)').addChannelTypes(ChannelType.GuildText))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const reviewChannel = interaction.options.getChannel('review_channel') || interaction.channel;

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(PANEL_TITLE)
        .setDescription(PANEL_DESCRIPTION);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`app_open_staff_${reviewChannel.id}`).setLabel('Apply for Staff').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`app_open_partner_${reviewChannel.id}`).setLabel('Apply for Partner').setEmoji('🤝').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`app_open_builder_${reviewChannel.id}`).setLabel('Apply for Builder').setEmoji('🏗️').setStyle(ButtonStyle.Secondary),
      );

      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Application panel posted in ${channel}. Submissions will be reviewed in ${reviewChannel}.`, ephemeral: true });
    },
  },
];

// Opens the right modal when someone clicks an "Apply for ___" button.
// customId format: app_open_<category>_<reviewChannelId>
async function handleApplicationButtonClick(interaction) {
  const parts = interaction.customId.split('_'); // app_open_staff_123, etc.
  const category = parts[2];
  const reviewChannelId = parts[3];
  const config = CATEGORIES[category];

  if (!config) return;

  const modal = new ModalBuilder()
    .setCustomId(`app_submit_${category}_${reviewChannelId}`)
    .setTitle(config.modalTitle);

  const rows = config.fields.map(field =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(field.key)
        .setLabel(field.label)
        .setStyle(field.style)
        .setRequired(field.required)
        .setMaxLength(field.style === TextInputStyle.Paragraph ? 1000 : 100)
    )
  );

  modal.addComponents(...rows);
  await interaction.showModal(modal);
}

// Handles the modal submission, builds a review embed with Accept/Deny buttons.
// customId format: app_submit_<category>_<reviewChannelId>
async function handleApplicationModalSubmit(interaction) {
  const parts = interaction.customId.split('_');
  const category = parts[2];
  const reviewChannelId = parts[3];
  const config = CATEGORIES[category];

  if (!config) {
    return interaction.reply({ content: 'Something went wrong — unknown application category.', ephemeral: true });
  }

  const answers = {};
  for (const field of config.fields) {
    answers[field.key] = interaction.fields.getTextInputValue(field.key) || 'N/A';
  }

  const embed = new EmbedBuilder()
    .setColor(0xF39C12)
    .setTitle(`📋 New ${config.label} Application`)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: 'Applicant', value: interaction.user.tag, inline: true },
      { name: 'Category', value: config.label, inline: true },
      ...config.fields.map(field => ({ name: field.label, value: answers[field.key] })),
    )
    .setFooter({ text: `User ID: ${interaction.user.id}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`app_accept_${interaction.user.id}`).setLabel('Accept').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`app_deny_${interaction.user.id}`).setLabel('Deny').setEmoji('❌').setStyle(ButtonStyle.Danger),
  );

  const reviewChannel = interaction.guild.channels.cache.get(reviewChannelId) || interaction.channel;
  await reviewChannel.send({ embeds: [embed], components: [row] });

  await interaction.reply({ content: '✅ Your application has been submitted! Please wait for a staff decision.', ephemeral: true });
}

// Handles the Accept/Deny buttons on a submitted application embed.
async function handleApplicationDecision(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({ content: "You don't have permission to review applications.", ephemeral: true });
  }

  const parts = interaction.customId.split('_'); // app_accept_<userId> or app_deny_<userId>
  const decision = parts[1];
  const applicantId = parts[2];
  const isAccept = decision === 'accept';

  const originalEmbed = interaction.message.embeds[0];
  const updatedEmbed = EmbedBuilder.from(originalEmbed)
    .setColor(isAccept ? 0x2ECC71 : 0xE74C3C)
    .setFooter({ text: `${isAccept ? 'Accepted' : 'Denied'} by ${interaction.user.tag}` });

  await interaction.update({ embeds: [updatedEmbed], components: [] });

  const applicant = await interaction.client.users.fetch(applicantId).catch(() => null);
  if (applicant) {
    const dmText = isAccept
      ? `🎉 Congratulations! Your application in **${interaction.guild.name}** has been **accepted** by ${interaction.user.tag}. A staff member will be in touch.`
      : `Your application in **${interaction.guild.name}** has been **denied** by ${interaction.user.tag}. You're welcome to apply again after the cooldown.`;
    await applicant.send(dmText).catch(() => {});
  }
}

module.exports.handleApplicationButtonClick = handleApplicationButtonClick;
module.exports.handleApplicationModalSubmit = handleApplicationModalSubmit;
module.exports.handleApplicationDecision = handleApplicationDecision;
