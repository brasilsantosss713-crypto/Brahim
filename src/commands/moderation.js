const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const store = require('../data/store');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a member from the server')
      .addUserOption(o => o.setName('user').setDescription('The member to ban').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for the ban'))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = interaction.guild.members.cache.get(user.id);

      if (member && !member.bannable) {
        return interaction.reply({ content: `I can't ban ${user.tag} — check role hierarchy and my permissions.`, ephemeral: true });
      }

      await interaction.guild.members.ban(user.id, { reason });
      store.addModLog(interaction.guild.id, {
        type: 'ban', userId: user.id, userTag: user.tag,
        moderator: interaction.user.tag, reason,
      });
      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🔨 Member Banned')
        .addFields(
          { name: 'User', value: `${user.tag} (${user.id})` },
          { name: 'Reason', value: reason },
          { name: 'Moderator', value: interaction.user.tag },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('unban')
      .setDescription('Remove a ban from a user')
      .addStringOption(o => o.setName('userid').setDescription('The user ID to unban').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
      const userId = interaction.options.getString('userid');
      try {
        await interaction.guild.members.unban(userId);
        await interaction.reply(`✅ Unbanned user with ID \`${userId}\`.`);
      } catch (err) {
        await interaction.reply({ content: `Couldn't unban that user. Are they actually banned? (${err.message})`, ephemeral: true });
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a member from the server')
      .addUserOption(o => o.setName('user').setDescription('The member to kick').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for the kick'))
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = interaction.guild.members.cache.get(user.id);

      if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
      if (!member.kickable) return interaction.reply({ content: `I can't kick ${user.tag} — check role hierarchy and my permissions.`, ephemeral: true });

      await member.kick(reason);
      store.addModLog(interaction.guild.id, {
        type: 'kick', userId: user.id, userTag: user.tag,
        moderator: interaction.user.tag, reason,
      });
      await interaction.reply(`👢 Kicked **${user.tag}**. Reason: ${reason}`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('timeout')
      .setDescription('Temporarily mute a member')
      .addUserOption(o => o.setName('user').setDescription('The member to timeout').setRequired(true))
      .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for the timeout'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = interaction.guild.members.cache.get(user.id);

      if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
      if (!member.moderatable) return interaction.reply({ content: `I can't timeout ${user.tag}.`, ephemeral: true });

      await member.timeout(minutes * 60 * 1000, reason);
      store.addModLog(interaction.guild.id, {
        type: 'timeout', userId: user.id, userTag: user.tag,
        moderator: interaction.user.tag, reason, durationMinutes: minutes,
      });
      await interaction.reply(`⏱️ **${user.tag}** has been timed out for ${minutes} minute(s). Reason: ${reason}`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('untimeout')
      .setDescription('Remove a timeout from a member')
      .addUserOption(o => o.setName('user').setDescription('The member to remove timeout from').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });

      await member.timeout(null);
      await interaction.reply(`✅ Removed timeout from **${user.tag}**.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Issue a formal warning to a member')
      .addUserOption(o => o.setName('user').setDescription('The member to warn').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for the warning').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      const warnings = store.addWarning(user.id, {
        reason,
        moderator: interaction.user.tag,
        timestamp: Date.now(),
      });
      store.addModLog(interaction.guild.id, {
        type: 'warn', userId: user.id, userTag: user.tag,
        moderator: interaction.user.tag, reason,
      });

      await interaction.reply(`⚠️ **${user.tag}** has been warned. Reason: ${reason}\nTotal warnings: ${warnings.length}`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('warnings')
      .setDescription("View a member's warning history")
      .addUserOption(o => o.setName('user').setDescription('The member to check').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const warnings = store.getWarnings(user.id);

      if (warnings.length === 0) {
        return interaction.reply(`**${user.tag}** has no warnings.`);
      }

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle(`Warnings for ${user.tag}`)
        .setDescription(
          warnings
            .map((w, i) => `**${i + 1}.** ${w.reason} — by ${w.moderator} <t:${Math.floor(w.timestamp / 1000)}:R>`)
            .join('\n')
        );
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('clearwarnings')
      .setDescription('Clear all warnings for a member')
      .addUserOption(o => o.setName('user').setDescription('The member to clear').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      store.clearWarnings(user.id);
      await interaction.reply(`🧹 Cleared all warnings for **${user.tag}**.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('purge')
      .setDescription('Bulk delete messages in this channel')
      .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      const amount = interaction.options.getInteger('amount');
      if (amount < 1 || amount > 100) {
        return interaction.reply({ content: 'Please choose a number between 1 and 100.', ephemeral: true });
      }
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.reply({ content: `🧹 Deleted ${deleted.size} message(s).`, ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('lock')
      .setDescription('Lock this channel to prevent messages')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
      });
      await interaction.reply('🔒 This channel has been locked.');
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('unlock')
      .setDescription('Unlock a previously locked channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null,
      });
      await interaction.reply('🔓 This channel has been unlocked.');
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('slowmode')
      .setDescription('Set slowmode delay for this channel')
      .addIntegerOption(o => o.setName('seconds').setDescription('Delay in seconds (0 to disable)').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      const seconds = interaction.options.getInteger('seconds');
      await interaction.channel.setRateLimitPerUser(seconds);
      await interaction.reply(
        seconds === 0 ? '✅ Slowmode disabled.' : `🐌 Slowmode set to ${seconds} second(s).`
      );
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('mute')
      .setDescription('Mute a member indefinitely using the server mute role')
      .addUserOption(o => o.setName('user').setDescription('The member to mute').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for the mute'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });

      const settings = store.getSettings(interaction.guild.id);
      let mutedRole = settings.mutedRoleId ? interaction.guild.roles.cache.get(settings.mutedRoleId) : null;

      if (!mutedRole) {
        // Create a Muted role and lock it out of sending messages/speaking in every channel.
        mutedRole = await interaction.guild.roles.create({ name: 'Muted', color: 0x555555, reason: 'Auto-created for /mute' });
        settings.mutedRoleId = mutedRole.id;
        store.setSettings(interaction.guild.id, settings);

        await Promise.all(
          interaction.guild.channels.cache.map(channel =>
            channel.permissionOverwrites.edit(mutedRole, { SendMessages: false, Speak: false }).catch(() => {})
          )
        );
      }

      if (member.roles.cache.has(mutedRole.id)) {
        return interaction.reply({ content: `**${user.tag}** is already muted.`, ephemeral: true });
      }

      await member.roles.add(mutedRole, reason);
      store.addModLog(interaction.guild.id, { type: 'mute', userId: user.id, userTag: user.tag, moderator: interaction.user.tag, reason });
      await interaction.reply(`🔇 **${user.tag}** has been muted. Reason: ${reason}`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('unmute')
      .setDescription('Unmute a previously muted member')
      .addUserOption(o => o.setName('user').setDescription('The member to unmute').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });

      const settings = store.getSettings(interaction.guild.id);
      if (!settings.mutedRoleId || !member.roles.cache.has(settings.mutedRoleId)) {
        return interaction.reply({ content: `**${user.tag}** isn't muted.`, ephemeral: true });
      }

      await member.roles.remove(settings.mutedRoleId);
      store.addModLog(interaction.guild.id, { type: 'unmute', userId: user.id, userTag: user.tag, moderator: interaction.user.tag });
      await interaction.reply(`🔊 **${user.tag}** has been unmuted.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('delete')
      .setDescription('Delete a specific message by ID')
      .addStringOption(o => o.setName('messageid').setDescription('The message ID to delete').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      const messageId = interaction.options.getString('messageid');
      try {
        const message = await interaction.channel.messages.fetch(messageId);
        await message.delete();
        await interaction.reply({ content: '🗑️ Message deleted.', ephemeral: true });
      } catch (err) {
        await interaction.reply({ content: `Couldn't delete that message: ${err.message}`, ephemeral: true });
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('report')
      .setDescription('Report a user or message to the moderators')
      .addUserOption(o => o.setName('user').setDescription('The user to report').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Why you are reporting them').setRequired(true))
      .addStringOption(o => o.setName('messageid').setDescription('Optional related message ID')),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      const messageId = interaction.options.getString('messageid');
      const settings = store.getSettings(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('🚩 New Report')
        .addFields(
          { name: 'Reported User', value: `${user.tag} (${user.id})` },
          { name: 'Reported By', value: interaction.user.tag },
          { name: 'Reason', value: reason },
        )
        .setTimestamp();
      if (messageId) embed.addFields({ name: 'Message ID', value: messageId });

      const logChannel = settings.modLogChannelId
        ? interaction.guild.channels.cache.get(settings.modLogChannelId)
        : null;

      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
        await interaction.reply({ content: '✅ Your report has been sent to the moderators.', ephemeral: true });
      } else {
        await interaction.reply({
          content: "⚠️ No mod-log channel is configured yet (use `/settings` to set one). Here's your report so a moderator can act on it manually:",
          embeds: [embed],
        });
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('modlogs')
      .setDescription('View the moderation action log')
      .addUserOption(o => o.setName('user').setDescription('Filter by a specific member'))
      .addIntegerOption(o => o.setName('limit').setDescription('How many entries to show (default 10, max 25)'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const limit = Math.min(interaction.options.getInteger('limit') || 10, 25);
      const entries = store.getModLogs(interaction.guild.id, { userId: user?.id, limit });

      if (entries.length === 0) {
        return interaction.reply('No moderation actions logged yet.');
      }

      const lines = entries.map(e => {
        const time = `<t:${Math.floor(e.timestamp / 1000)}:R>`;
        const target = e.userTag ? ` on **${e.userTag}**` : '';
        const reasonText = e.reason ? ` — ${e.reason}` : '';
        return `**#${e.id}** \`${e.type}\`${target} by ${e.moderator}${reasonText} (${time})`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle(`📋 Moderation Log${user ? ` — ${user.tag}` : ''}`)
        .setDescription(lines.join('\n'));
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('automod')
      .setDescription('Configure automatic moderation rules')
      .addStringOption(o =>
        o.setName('action').setDescription('What to do').setRequired(true)
          .addChoices(
            { name: 'Enable', value: 'enable' },
            { name: 'Disable', value: 'disable' },
            { name: 'Add banned word', value: 'add' },
            { name: 'Remove banned word', value: 'remove' },
            { name: 'List banned words', value: 'list' },
          )
      )
      .addStringOption(o => o.setName('word').setDescription('Word to add/remove (required for add/remove)'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const action = interaction.options.getString('action');
      const word = interaction.options.getString('word')?.toLowerCase();
      const settings = store.getSettings(interaction.guild.id);

      if ((action === 'add' || action === 'remove') && !word) {
        return interaction.reply({ content: 'Please provide a word for this action.', ephemeral: true });
      }

      switch (action) {
        case 'enable':
          settings.automod.enabled = true;
          store.setSettings(interaction.guild.id, settings);
          return interaction.reply('✅ Automod enabled. Messages containing banned words will be deleted.');
        case 'disable':
          settings.automod.enabled = false;
          store.setSettings(interaction.guild.id, settings);
          return interaction.reply('✅ Automod disabled.');
        case 'add':
          if (!settings.automod.bannedWords.includes(word)) settings.automod.bannedWords.push(word);
          store.setSettings(interaction.guild.id, settings);
          return interaction.reply(`✅ Added \`${word}\` to the banned word list.`);
        case 'remove':
          settings.automod.bannedWords = settings.automod.bannedWords.filter(w => w !== word);
          store.setSettings(interaction.guild.id, settings);
          return interaction.reply(`✅ Removed \`${word}\` from the banned word list.`);
        case 'list':
          return interaction.reply({
            content: settings.automod.bannedWords.length
              ? `Automod is **${settings.automod.enabled ? 'enabled' : 'disabled'}**. Banned words: ${settings.automod.bannedWords.map(w => `\`${w}\``).join(', ')}`
              : `Automod is **${settings.automod.enabled ? 'enabled' : 'disabled'}**. No banned words configured yet.`,
            ephemeral: true,
          });
      }
    },
  },
];
