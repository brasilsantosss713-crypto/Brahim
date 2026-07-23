const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const store = require('../data/store');

// --- Edit this placeholder content to match your actual server ---

const RULES_TEXT = `1. Be respectful to all members and staff.
2. No spamming, advertising, or self-promotion without permission.
3. No NSFW, hateful, or illegal content.
4. Follow Discord's Terms of Service and Community Guidelines.
5. Listen to staff — their decisions are final.

Breaking these rules may result in a warning, mute, kick, or ban depending on severity.`;

const ABOUT_TEXT = `Welcome! We're a growing community built around fun, fair play, and a great group of members.

Here you'll find events, giveaways, a leveling system, an economy, and a friendly staff team ready to help.

Feel free to introduce yourself and get involved!`;

const FAQ_ENTRIES = [
  { q: 'How do I get support?', a: 'Open a ticket using the ticket panel, or ask in the general chat.' },
  { q: 'How does the leveling system work?', a: 'You earn XP by chatting. Check your progress with /rank.' },
  { q: 'How do I report a member?', a: 'Use the /report command or open a ticket.' },
];

function buildRulesEmbed() {
  return new EmbedBuilder().setColor(0xE74C3C).setTitle('📜 Server Rules').setDescription(RULES_TEXT);
}

function buildAboutEmbed(guild) {
  return new EmbedBuilder().setColor(0x3498DB).setTitle(`ℹ️ About ${guild.name}`).setDescription(ABOUT_TEXT);
}

function buildFaqEmbed() {
  return new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('❓ Frequently Asked Questions')
    .setDescription(FAQ_ENTRIES.map(f => `**${f.q}**\n${f.a}`).join('\n\n'));
}

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('serversetup')
      .setDescription('Post rules/about/FAQ messages and set permissions in your EXISTING channels')
      .addChannelOption(o => o.setName('rules_channel').setDescription('Your existing rules channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
      .addChannelOption(o => o.setName('about_channel').setDescription('Your existing about-us channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
      .addChannelOption(o => o.setName('faq_channel').setDescription('Your existing FAQ channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
      .addRoleOption(o => o.setName('staff_role').setDescription('Role allowed to post in rules/about/faq').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const guild = interaction.guild;
      const rulesChannel = interaction.options.getChannel('rules_channel');
      const aboutChannel = interaction.options.getChannel('about_channel');
      const faqChannel = interaction.options.getChannel('faq_channel');
      const staffRole = interaction.options.getRole('staff_role');

      await interaction.deferReply({ ephemeral: true });

      const settings = store.getSettings(guild.id);
      settings.serverInfoChannels = {
        rulesChannelId: rulesChannel.id,
        aboutChannelId: aboutChannel.id,
        faqChannelId: faqChannel.id,
        staffRoleId: staffRole.id,
      };
      store.setSettings(guild.id, settings);

      for (const channel of [rulesChannel, aboutChannel, faqChannel]) {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          ViewChannel: true,
          SendMessages: false,
        }).catch(() => {});
        await channel.permissionOverwrites.edit(staffRole, {
          ViewChannel: true,
          SendMessages: true,
        }).catch(() => {});
      }

      await rulesChannel.send({ embeds: [buildRulesEmbed()] });
      await aboutChannel.send({ embeds: [buildAboutEmbed(guild)] });
      await faqChannel.send({ embeds: [buildFaqEmbed()] });

      await interaction.editReply(
        `✅ Setup complete!\n• Rules posted in ${rulesChannel}\n• About posted in ${aboutChannel}\n• FAQ posted in ${faqChannel}\n• Permissions configured on all three channels\n\n📝 The text is placeholder content — edit the constants at the top of \`serverinfo.js\` to customize it, then re-run this command.`
      );
    },
  },
];
