const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const LAYOUT = [
  {
    category: '━━━━━━『🍩DONUT SMP』━━━━━━',
    channels: [
      '📌»┃welcome',
      '📜»┃rules',
      '📢»┃announcements',
      '🍩»┃about-us',
      '🔗»┃important-links',
      '❓»┃faq',
    ],
  },
  {
    category: '━━━━━━『📰NEWS & UPDATES』━━━━━━',
    channels: [
      '🔔»┃server-updates',
      '🍩»┃donut-news',
      '📅»┃events',
      '🎥»┃content-drops',
    ],
  },
  {
    category: '━━━━━━『💬GENERAL』━━━━━━',
    channels: [
      '💬»┃general-chat',
      '🍩»┃donut-talk',
      '🖼️»┃media-share',
      '😂»┃memes',
      '🌙»┃off-topic',
      '🔥»┃hot-takes',
    ],
  },
  {
    category: '━━━━━━『⛏️MINECRAFT』━━━━━━',
    channels: [
      '🗺️»┃smp-discussion',
      '📸»┃screenshots',
      '🏗️»┃builds-showcase',
      '💀»┃death-logs',
      '⚔️»┃pvp-clips',
      '🍩»┃base-showcase',
    ],
  },
  {
    category: '━━━━━━『🎮FUN & GAMES』━━━━━━',
    channels: [
      '🎲»┃bot-commands',
      '🏆»┃giveaways',
      '📊»┃polls',
      '🎰»┃gambling',
      '🍩»┃donut-of-the-day',
    ],
  },
  {
    category: '━━━━━━『💰ECONOMY』━━━━━━',
    channels: [
      '💰»┃balance',
      '🏪»┃shop',
      '🏦»┃bank',
      '📈»┃leaderboard',
      '🎁»┃daily-rewards',
    ],
  },
  {
    category: '━━━━━━『📊LEVELING』━━━━━━',
    channels: [
      '⭐»┃rank-check',
      '🏅»┃level-roles',
      '🎖️»┃milestones',
    ],
  },
  {
    category: '━━━━━━『✅ISSA VOUCHES』━━━━━━',
    channels: [
      '📌»┃vouches-info',
      '📜»┃vouches-rules',
      '✅»┃vouches',
      '⭐»┃top-vouchers',
      '🏆»┃vouch-leaderboard',
      '❌»┃denied-vouches',
      '🔍»┃vouch-lookup',
      '📊»┃vouch-stats',
    ],
  },
  {
    category: '━━━━━━『👔STAFF ONLY』━━━━━━',
    channels: [
      '💬»┃staff-chat',
      '☕»┃staff-break',
      '📋»┃mod-logs',
      '⚠️»┃strikes',
      '✅»┃activity-check',
      '📦»┃suggestions-review',
      '📊»┃staff-stats',
      '🚶»┃staff-movement',
    ],
  },
  {
    category: '━━━━━━『🎫SUPPORT』━━━━━━',
    channels: [
      '🎫»┃open-ticket',
      '📩»┃ticket-logs',
      '⚠️»┃reports',
      '🍩»┃applications',
    ],
  },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Create the full server layout (all categories + channels)')
      .addBooleanOption(o => o.setName('confirm').setDescription('Confirm you want to build the server layout').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const confirm = interaction.options.getBoolean('confirm');
      if (!confirm) {
        return interaction.reply({ content: 'Setup cancelled. Run again with `confirm: True` when ready — this creates a lot of channels!', ephemeral: true });
      }

      await interaction.deferReply();
      const guild = interaction.guild;

      let categoriesCreated = 0;
      let channelsCreated = 0;
      let skipped = 0;

      for (const section of LAYOUT) {
        let categoryChannel = guild.channels.cache.find(
          c => c.type === ChannelType.GuildCategory && c.name === section.category
        );

        if (!categoryChannel) {
          try {
            categoryChannel = await guild.channels.create({
              name: section.category,
              type: ChannelType.GuildCategory,
            });
            categoriesCreated++;
            await sleep(500);
          } catch (err) {
            console.error(`Failed to create category "${section.category}":`, err);
            continue;
          }
        } else {
          skipped++;
        }

        for (const channelName of section.channels) {
          const exists = guild.channels.cache.find(
            c => c.parentId === categoryChannel.id && c.name === channelName
          );
          if (exists) {
            skipped++;
            continue;
          }

          try {
            await guild.channels.create({
              name: channelName,
              type: ChannelType.GuildText,
              parent: categoryChannel.id,
            });
            channelsCreated++;
            await sleep(500);
          } catch (err) {
            console.error(`Failed to create channel "${channelName}":`, err);
          }
        }
      }

      await interaction.editReply(
        `✅ Server setup complete!\n**Categories created:** ${categoriesCreated}\n**Channels created:** ${channelsCreated}\n**Skipped (already existed):** ${skipped}`
      );
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('wipeserver')
      .setDescription('⚠️ DANGER: Delete ALL channels and categories in this server (irreversible)')
      .addStringOption(o => o.setName('server_name').setDescription("Type this server's exact name to confirm").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const typed = interaction.options.getString('server_name');

      if (typed !== interaction.guild.name) {
        return interaction.reply({
          content: `❌ That doesn't match. To confirm you understand this deletes **every channel and category**, type the server's exact name: \`${interaction.guild.name}\``,
          ephemeral: true,
        });
      }

      await interaction.deferReply();
      const guild = interaction.guild;

      const allChannels = Array.from(guild.channels.cache.values());
      const currentChannel = allChannels.find(c => c.id === interaction.channel.id);
      const otherChannels = allChannels.filter(c => c.id !== interaction.channel.id);

      let deleted = 0;
      for (const channel of otherChannels) {
        try {
          await channel.delete('Server wipe requested via /wipeserver');
          deleted++;
          await sleep(500);
        } catch (err) {
          console.error(`Failed to delete channel "${channel.name}":`, err);
        }
      }

      await interaction.editReply(`✅ Deleted ${deleted} channel(s)/categor(y/ies). This channel will be removed in a few seconds too.`);

      if (currentChannel) {
        await sleep(2000);
        await currentChannel.delete('Server wipe requested via /wipeserver').catch(() => {});
      }
    },
  },
];
