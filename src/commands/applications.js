const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
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
    questions: [
      { key: 'age', prompt: "What's your age?" },
      { key: 'networth', prompt: "What's your networth? (min 50M)" },
      { key: 'activity', prompt: "What's your weekly activity? (min 10M)" },
      { key: 'experience', prompt: 'Do you have any relevant experience? If so, describe it.' },
      { key: 'why', prompt: 'Why should we pick you?' },
    ],
  },
  partner: {
    label: 'Partner Manager',
    questions: [
      { key: 'age', prompt: "What's your age?" },
      { key: 'experience', prompt: 'Describe your 5+ server partnership experience.' },
      { key: 'weekly_partners', prompt: 'How many partners can you realistically bring in weekly?' },
      { key: 'why', prompt: 'Why should we pick you?' },
    ],
  },
  builder: {
    label: 'Builder',
    questions: [
      { key: 'age', prompt: "What's your age?" },
      { key: 'networth', prompt: "What's your networth? (min 100M)" },
      { key: 'portfolio', prompt: 'Share links to your build portfolio/examples.' },
      { key: 'why', prompt: 'Why should we pick you?' },
    ],
  },
};

const QUESTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per question

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

// Runs the whole DM Q&A flow when someone clicks an "Apply for ___" button.
// customId format: app_open_<category>_<reviewChannelId>
async function handleApplicationButtonClick(interaction) {
  const parts = interaction.customId.split('_');
  const category = parts[2];
  const reviewChannelId = parts[3];
  const config = CATEGORIES[category];
  if (!config) return;

  const guild = interaction.guild;
  const user = interaction.user;

  let dmChannel;
  try {
    dmChannel = await user.createDM();
    await dmChannel.send(
      `👋 Hey! Thanks for applying for **${config.label}** in **${guild.name}**.\n` +
      `I'll ask you ${config.questions.length} quick questions — just reply here with your answer after each one. ` +
      `You have 5 minutes per question.`
    );
  } catch {
    return interaction.reply({
      content: "⚠️ I couldn't DM you — please enable direct messages from server members and try again.",
      ephemeral: true,
    });
  }

  await interaction.reply({ content: '✅ Check your DMs to continue your application!', ephemeral: true });

  const answers = {};
  for (const question of config.questions) {
    await dmChannel.send(`**${question.prompt}**`);

    try {
      const collected = await dmChannel.awaitMessages({
        filter: m => m.author.id === user.id,
        max: 1,
        time: QUESTION_TIMEOUT_MS,
        errors: ['time'],
      });
      answers[question.key] = collected.first().content;
    } catch {
      await dmChannel.send('⏰ You took too long to respond. Please click **Apply** again to restart your application.').catch(() => {});
      return;
    }
  }

  await dmChannel.send('✅ Thanks! Your application has been submitted for review. Sit tight for a staff decision.').catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(0xF39C12)
    .setTitle(`📋 New ${config.label} Application`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: 'Applicant', value: user.tag, inline: true },
      { name: 'Category', value: config.label, inline: true },
      ...config.questions.map(q => ({ name: q.prompt, value: answers[q.key] || 'N/A' })),
    )
    .setFooter({ text: `User ID: ${user.id}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`app_accept_${user.id}`).setLabel('Accept').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`app_deny_${user.id}`).setLabel('Deny').setEmoji('❌').setStyle(ButtonStyle.Danger),
  );

  const reviewChannel = guild.channels.cache.get(reviewChannelId);
  if (reviewChannel) {
    await reviewChannel.send({ embeds: [embed], components: [row] });
  }
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
module.exports.handleApplicationDecision = handleApplicationDecision;
