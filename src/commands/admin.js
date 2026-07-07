const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const store = require('../data/store');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('role')
      .setDescription("Add or remove a role from a member")
      .addUserOption(o => o.setName('user').setDescription('The member').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('The role').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const member = interaction.guild.members.cache.get(user.id);

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        await interaction.reply(`➖ Removed **${role.name}** from **${user.tag}**.`);
      } else {
        await member.roles.add(role);
        await interaction.reply(`➕ Added **${role.name}** to **${user.tag}**.`);
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('nick')
      .setDescription("Change a member's nickname")
      .addUserOption(o => o.setName('user').setDescription('The member').setRequired(true))
      .addStringOption(o => o.setName('nickname').setDescription('New nickname (leave blank to reset)'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const nickname = interaction.options.getString('nickname');
      const member = interaction.guild.members.cache.get(user.id);

      await member.setNickname(nickname || null);
      await interaction.reply(`✅ Updated nickname for **${user.tag}**.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('announce')
      .setDescription('Send a formatted announcement')
      .addStringOption(o => o.setName('message').setDescription('The announcement text').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Channel to send to').addChannelTypes(ChannelType.GuildText))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const message = interaction.options.getString('message');
      const channel = interaction.options.getChannel('channel') || interaction.channel;

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('📢 Announcement')
        .setDescription(message)
        .setFooter({ text: `Posted by ${interaction.user.tag}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Announcement sent to ${channel}.`, ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('embed')
      .setDescription('Create and send a custom embed')
      .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(true))
      .addStringOption(o => o.setName('color').setDescription('Hex color, e.g. #5865F2'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const color = interaction.options.getString('color') || '#5865F2';

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color);

      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('serverstats')
      .setDescription('View detailed server statistics'),
    async execute(interaction) {
      const guild = interaction.guild;
      const members = await guild.members.fetch();
      const humans = members.filter(m => !m.user.bot).size;
      const bots = members.filter(m => m.user.bot).size;

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`📊 ${guild.name} Statistics`)
        .setThumbnail(guild.iconURL())
        .addFields(
          { name: 'Total Members', value: `${guild.memberCount}`, inline: true },
          { name: 'Humans', value: `${humans}`, inline: true },
          { name: 'Bots', value: `${bots}`, inline: true },
          { name: 'Text Channels', value: `${guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size}`, inline: true },
          { name: 'Voice Channels', value: `${guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size}`, inline: true },
          { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
          { name: 'Boost Level', value: `${guild.premiumTier}`, inline: true },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('channelcreate')
      .setDescription('Create a new text channel')
      .addStringOption(o => o.setName('name').setDescription('Channel name').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      const name = interaction.options.getString('name');
      const channel = await interaction.guild.channels.create({ name, type: ChannelType.GuildText });
      await interaction.reply(`✅ Created channel ${channel}.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('channeldelete')
      .setDescription('Delete a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to delete').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      await channel.delete();
      await interaction.reply(`🗑️ Deleted channel **#${channel.name}**.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('promote')
      .setDescription("Move a member up your server's configured role hierarchy")
      .addUserOption(o => o.setName('user').setDescription('The member to promote').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const member = interaction.guild.members.cache.get(user.id);
      const settings = store.getSettings(interaction.guild.id);
      const hierarchy = settings.hierarchy;

      if (hierarchy.length === 0) {
        return interaction.reply({ content: "No promotion hierarchy is configured yet. Set one with `/settings hierarchy-add`.", ephemeral: true });
      }

      const currentIndex = hierarchy.reduce((highest, roleId, i) => (member.roles.cache.has(roleId) ? i : highest), -1);
      const nextIndex = currentIndex + 1;

      if (nextIndex >= hierarchy.length) {
        return interaction.reply({ content: `**${user.tag}** is already at the top of the hierarchy.`, ephemeral: true });
      }

      const nextRole = interaction.guild.roles.cache.get(hierarchy[nextIndex]);
      if (!nextRole) return interaction.reply({ content: 'The next role in the hierarchy no longer exists. Check `/settings hierarchy-list`.', ephemeral: true });

      if (currentIndex >= 0) await member.roles.remove(hierarchy[currentIndex]).catch(() => {});
      await member.roles.add(nextRole);

      await interaction.reply(`⬆️ Promoted **${user.tag}** to **${nextRole.name}**.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('demote')
      .setDescription("Move a member down your server's configured role hierarchy")
      .addUserOption(o => o.setName('user').setDescription('The member to demote').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const member = interaction.guild.members.cache.get(user.id);
      const settings = store.getSettings(interaction.guild.id);
      const hierarchy = settings.hierarchy;

      if (hierarchy.length === 0) {
        return interaction.reply({ content: "No promotion hierarchy is configured yet. Set one with `/settings hierarchy-add`.", ephemeral: true });
      }

      const currentIndex = hierarchy.reduce((highest, roleId, i) => (member.roles.cache.has(roleId) ? i : highest), -1);

      if (currentIndex <= 0) {
        await member.roles.remove(hierarchy[0]).catch(() => {});
        return interaction.reply(`⬇️ **${user.tag}** has been removed from the hierarchy entirely.`);
      }

      const prevRole = interaction.guild.roles.cache.get(hierarchy[currentIndex - 1]);
      await member.roles.remove(hierarchy[currentIndex]).catch(() => {});
      if (prevRole) await member.roles.add(prevRole);

      await interaction.reply(`⬇️ Demoted **${user.tag}** to **${prevRole ? prevRole.name : 'no rank'}**.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('reactionroles')
      .setDescription('Set up a message where reacting with an emoji grants a role')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true).addChannelTypes(ChannelType.GuildText))
      .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Embed description, e.g. "React to get a role!"').setRequired(true))
      .addStringOption(o => o.setName('emoji1').setDescription('First emoji').setRequired(true))
      .addRoleOption(o => o.setName('role1').setDescription('Role for the first emoji').setRequired(true))
      .addStringOption(o => o.setName('emoji2').setDescription('Second emoji'))
      .addRoleOption(o => o.setName('role2').setDescription('Role for the second emoji'))
      .addStringOption(o => o.setName('emoji3').setDescription('Third emoji'))
      .addRoleOption(o => o.setName('role3').setDescription('Role for the third emoji'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');

      const pairs = [1, 2, 3]
        .map(n => ({ emoji: interaction.options.getString(`emoji${n}`), role: interaction.options.getRole(`role${n}`) }))
        .filter(p => p.emoji && p.role);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(`${description}\n\n${pairs.map(p => `${p.emoji} — ${p.role}`).join('\n')}`);

      const message = await channel.send({ embeds: [embed] });
      for (const pair of pairs) {
        await message.react(pair.emoji).catch(() => {});
      }

      const settings = store.getSettings(interaction.guild.id);
      settings.reactionRoles[message.id] = Object.fromEntries(pairs.map(p => [p.emoji, p.role.id]));
      store.setSettings(interaction.guild.id, settings);

      await interaction.reply({ content: `✅ Reaction role message posted in ${channel}.`, ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('welcome')
      .setDescription('Configure welcome messages for new members')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post welcomes in (omit to disable)').addChannelTypes(ChannelType.GuildText))
      .addStringOption(o => o.setName('message').setDescription('Message template. Use {user} and {server}'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      const settings = store.getSettings(interaction.guild.id);

      settings.welcomeChannelId = channel ? channel.id : null;
      if (message) settings.welcomeMessage = message;
      store.setSettings(interaction.guild.id, settings);

      await interaction.reply(
        channel
          ? `✅ Welcome messages will be posted in ${channel}.\nTemplate: "${settings.welcomeMessage}"`
          : '✅ Welcome messages disabled.'
      );
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('goodbye')
      .setDescription('Configure leave messages for departing members')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post goodbyes in (omit to disable)').addChannelTypes(ChannelType.GuildText))
      .addStringOption(o => o.setName('message').setDescription('Message template. Use {user} and {server}'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      const settings = store.getSettings(interaction.guild.id);

      settings.goodbyeChannelId = channel ? channel.id : null;
      if (message) settings.goodbyeMessage = message;
      store.setSettings(interaction.guild.id, settings);

      await interaction.reply(
        channel
          ? `✅ Goodbye messages will be posted in ${channel}.\nTemplate: "${settings.goodbyeMessage}"`
          : '✅ Goodbye messages disabled.'
      );
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('backup')
      .setDescription('Create a backup of the server structure (roles and channels)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const guild = interaction.guild;

      const roles = guild.roles.cache
        .filter(r => r.id !== guild.id) // skip @everyone
        .map(r => ({
          name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable,
          permissions: r.permissions.bitfield.toString(), position: r.position,
        }));

      const channels = guild.channels.cache.map(c => ({
        name: c.name, type: c.type, position: c.position,
        parentName: c.parent ? c.parent.name : null,
      }));

      store.saveBackup(guild.id, { roles, channels });
      await interaction.reply(`💾 Backup created: **${roles.length} roles**, **${channels.length} channels**. Use \`/restore\` to recreate anything missing later.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('restore')
      .setDescription('Restore missing roles/channels from the last backup')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const backup = store.getBackup(interaction.guild.id);
      if (!backup) return interaction.reply({ content: 'No backup found for this server. Run `/backup` first.', ephemeral: true });

      await interaction.deferReply();
      const guild = interaction.guild;
      let rolesCreated = 0;
      let channelsCreated = 0;

      // Only recreates roles/channels that don't already exist by name —
      // this never deletes or overwrites anything currently in the server.
      for (const role of backup.roles) {
        if (!guild.roles.cache.some(r => r.name === role.name)) {
          await guild.roles.create({
            name: role.name, color: role.color, hoist: role.hoist,
            mentionable: role.mentionable, permissions: BigInt(role.permissions),
          }).catch(() => {});
          rolesCreated++;
        }
      }

      for (const channel of backup.channels) {
        if (!guild.channels.cache.some(c => c.name === channel.name)) {
          await guild.channels.create({ name: channel.name, type: channel.type }).catch(() => {});
          channelsCreated++;
        }
      }

      await interaction.editReply(
        `✅ Restore complete. Created ${rolesCreated} missing role(s) and ${channelsCreated} missing channel(s) from the backup taken <t:${Math.floor(backup.createdAt / 1000)}:R>.`
      );
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('settings')
      .setDescription("View or edit this server's SaharaBot settings")
      .addSubcommand(sub => sub.setName('view').setDescription('View current settings'))
      .addSubcommand(sub =>
        sub.setName('modlog-channel').setDescription('Set the channel used for /report and moderation logs')
          .addChannelOption(o => o.setName('channel').setDescription('The channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
      )
      .addSubcommand(sub =>
        sub.setName('hierarchy-add').setDescription('Add a role to the top of the promotion hierarchy')
          .addRoleOption(o => o.setName('role').setDescription('The role').setRequired(true))
      )
      .addSubcommand(sub =>
        sub.setName('hierarchy-remove').setDescription('Remove a role from the promotion hierarchy')
          .addRoleOption(o => o.setName('role').setDescription('The role').setRequired(true))
      )
      .addSubcommand(sub => sub.setName('hierarchy-list').setDescription('List the current promotion hierarchy'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();
      const settings = store.getSettings(interaction.guild.id);

      if (sub === 'view') {
        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('⚙️ Server Settings')
          .addFields(
            { name: 'Mod-log Channel', value: settings.modLogChannelId ? `<#${settings.modLogChannelId}>` : 'Not set' },
            { name: 'Welcome Channel', value: settings.welcomeChannelId ? `<#${settings.welcomeChannelId}>` : 'Disabled' },
            { name: 'Goodbye Channel', value: settings.goodbyeChannelId ? `<#${settings.goodbyeChannelId}>` : 'Disabled' },
            { name: 'Muted Role', value: settings.mutedRoleId ? `<@&${settings.mutedRoleId}>` : 'Not created yet' },
            { name: 'Automod', value: settings.automod.enabled ? `Enabled (${settings.automod.bannedWords.length} banned word(s))` : 'Disabled' },
            { name: 'Promotion Hierarchy', value: settings.hierarchy.length ? `${settings.hierarchy.length} role(s) — use \`/settings hierarchy-list\`` : 'Not configured' },
          );
        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'modlog-channel') {
        const channel = interaction.options.getChannel('channel');
        settings.modLogChannelId = channel.id;
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply(`✅ Mod-log channel set to ${channel}.`);
      }

      if (sub === 'hierarchy-add') {
        const role = interaction.options.getRole('role');
        if (!settings.hierarchy.includes(role.id)) settings.hierarchy.push(role.id);
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply(`✅ Added **${role.name}** to the hierarchy (position ${settings.hierarchy.length}).`);
      }

      if (sub === 'hierarchy-remove') {
        const role = interaction.options.getRole('role');
        settings.hierarchy = settings.hierarchy.filter(id => id !== role.id);
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply(`✅ Removed **${role.name}** from the hierarchy.`);
      }

      if (sub === 'hierarchy-list') {
        if (settings.hierarchy.length === 0) return interaction.reply('No hierarchy configured yet.');
        const lines = settings.hierarchy.map((id, i) => {
          const role = interaction.guild.roles.cache.get(id);
          return `${i + 1}. ${role ? role.name : `Unknown role (${id})`}`;
        });
        return interaction.reply(`**Promotion hierarchy** (lowest to highest):\n${lines.join('\n')}`);
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('permissions')
      .setDescription("View a role's or the bot's permissions in this server")
      .addRoleOption(o => o.setName('role').setDescription('Check a specific role instead of the bot'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const role = interaction.options.getRole('role');

      if (role) {
        const perms = role.permissions.toArray();
        const embed = new EmbedBuilder()
          .setColor(role.color || 0x99AAB5)
          .setTitle(`🔑 Permissions for @${role.name}`)
          .setDescription(perms.length ? perms.map(p => `\`${p}\``).join(', ') : 'No notable permissions.');
        return interaction.reply({ embeds: [embed] });
      }

      const botMember = interaction.guild.members.me;
      const perms = botMember.permissions.toArray();
      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle("🔑 SaharaBot's Server Permissions")
        .setDescription(perms.length ? perms.map(p => `\`${p}\``).join(', ') : 'No notable permissions — check the role setup!');
      await interaction.reply({ embeds: [embed] });
    },
  },
];
