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

const ROLE_LAYOUT = [
  {
    section: '👑 OWNER',
    roles: ['👑 Owner', '👑 Co-Owner', '⚜️ Developer', '🛠️ Manager', '📋 Administrator'],
  },
  {
    section: '🛡️ STAFF',
    roles: [
      '🛡️ Head Moderator', '🔨 Moderator', '🧑\u200d⚖️ Trial Moderator', '🎫 Support Team',
      '🎉 Giveaway Manager', '🤝 Partnership Manager', '📢 Event Host', '🤖 Bot Manager', '📸 Media Team',
    ],
  },
  {
    section: '🍩 DONUTSMP',
    roles: [
      '🍩 Donut Legend', '🍩 Donut Veteran', '🍩 Donut Member', '👑 Donut King', '💰 Millionaire',
      '💎 Billionaire', '🏦 Spawn Investor', '🛒 Marketplace Seller', '🤝 Trusted Trader', '🏆 Richest Player',
      '⚔️ PvP Champion', '🛡️ PvP Warrior', '🏹 Archer', '⛏️ Miner', '🪓 Lumberjack', '🌾 Farmer',
      '🎣 Fisherman', '🏗️ Master Builder', '🏰 Kingdom Owner', '🧭 Explorer', '🐉 Dragon Slayer',
      '💀 Bounty Hunter', '🎯 Grinder', '📦 Collector', '🔥 Nether Explorer', '🌌 End Conqueror',
    ],
  },
  {
    section: '⭐ LEVELING',
    roles: [
      '🌱 Level 5', '🍃 Level 10', '⭐ Level 15', '🔥 Level 20', '💎 Level 30', '👑 Level 40',
      '🏆 Level 50', '🌌 Level 75', '⚡ Level 100', '💠 Prestige I', '💠 Prestige II', '💠 Prestige III',
    ],
  },
  {
    section: '💎 SPECIAL',
    roles: [
      '💎 Booster', '⭐ VIP', '🏆 Donator', '❤️ Supporter', '🎥 Content Creator', '📺 Streamer',
      '🤝 Partner', '🥇 OG Member', '🎊 Early Supporter', "👑 Issa's Elite",
    ],
  },
  {
    section: '🎨 COLORS',
    roles: ['❤️ Red', '🧡 Orange', '💛 Yellow', '💚 Green', '🩵 Cyan', '💙 Blue', '💜 Purple', '🩷 Pink', '🖤 Black', '🤍 White'],
  },
  {
    section: '🔔 PINGS',
    roles: ['🎁 Giveaway Ping', '⚡ Quickdrop Ping', '📢 Announcement Ping', '🎉 Event Ping', '🍩 DonutSMP Ping', '🤝 Partner Ping'],
  },
  {
    section: '🤖 OTHER',
    roles: ['😴 AFK', '🤖 Bots'],
  },
];

const ROLE_COLORS = {
  '❤️ Red': 0xE74C3C,
  '🧡 Orange': 0xE67E22,
  '💛 Yellow': 0xF1C40F,
  '💚 Green': 0x2ECC71,
  '🩵 Cyan': 0x1ABC9C,
  '💙 Blue': 0x3498DB,
  '💜 Purple': 0x9B59B6,
  '🩷 Pink': 0xE91E63,
  '🖤 Black': 0x23272A,
  '🤍 White': 0xFFFFFF,
};

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

  {
    data: new SlashCommandBuilder()
      .setName('importroles')
      .setDescription('Create the full role hierarchy (Owner, Staff, DonutSMP, Leveling, Special, Colors, Pings, Other)')
      .addBooleanOption(o => o.setName('confirm').setDescription('Confirm you want to create ~88 roles').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const confirm = interaction.options.getBoolean('confirm');
      if (!confirm) {
        return interaction.reply({ content: 'Cancelled. Run again with `confirm: True` when ready — this creates a lot of roles!', ephemeral: true });
      }

      await interaction.deferReply();
      const guild = interaction.guild;
      let created = 0;
      let skipped = 0;

      for (const section of ROLE_LAYOUT) {
        const separatorName = `━━━━━━━━━━ ${section.section} ━━━━━━━━━━`;

        if (!guild.roles.cache.some(r => r.name === separatorName)) {
          try {
            await guild.roles.create({ name: separatorName, permissions: [], hoist: false, mentionable: false });
            created++;
            await sleep(500);
          } catch (err) {
            console.error(`Failed to create separator "${separatorName}":`, err);
          }
        } else {
          skipped++;
        }

        for (const roleName of section.roles) {
          if (guild.roles.cache.some(r => r.name === roleName)) {
            skipped++;
            continue;
          }

          try {
            await guild.roles.create({
              name: roleName,
              color: ROLE_COLORS[roleName] || null,
              permissions: [],
            });
            created++;
            await sleep(500);
          } catch (err) {
            console.error(`Failed to create role "${roleName}":`, err);
          }
        }
      }

      await interaction.editReply(
        `✅ Role import complete!\n**Created:** ${created}\n**Skipped (already existed):** ${skipped}\n\n⚠️ Discord doesn't preserve creation order visually — you'll likely want to drag the roles into the exact order shown in Server Settings → Roles.`
      );
    },
  },
];
