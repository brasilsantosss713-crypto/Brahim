const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('ping')
      .setDescription("Check the bot's response latency"),
    async execute(interaction) {
      const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      await interaction.editReply(`🏓 Pong! Latency: ${latency}ms | API: ${Math.round(interaction.client.ws.ping)}ms`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('userinfo')
      .setDescription('View information about a user')
      .addUserOption(o => o.setName('user').setDescription('The user to look up')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`👤 ${user.tag}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'ID', value: user.id, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
          { name: 'Joined Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : 'Unknown', inline: true },
          { name: 'Roles', value: member ? member.roles.cache.map(r => r.name).join(', ').slice(0, 1000) || 'None' : 'Unknown' },
        );
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('serverinfo')
      .setDescription('View information about the server'),
    async execute(interaction) {
      const guild = interaction.guild;

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`🌐 ${guild.name}`)
        .setThumbnail(guild.iconURL())
        .addFields(
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Members', value: `${guild.memberCount}`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
          { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
          { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
          { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true },
        );
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('avatar')
      .setDescription("View a user's avatar")
      .addUserOption(o => o.setName('user').setDescription('The user to look up')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`${user.username}'s Avatar`)
        .setImage(user.displayAvatarURL({ size: 512 }));
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('calculator')
      .setDescription('Perform a calculation')
      .addStringOption(o => o.setName('expression').setDescription('e.g. (4 + 5) * 2').setRequired(true)),
    async execute(interaction) {
      const expression = interaction.options.getString('expression');

      // Only allow safe numeric/math characters to avoid arbitrary code execution.
      if (!/^[0-9+\-*/().\s%]+$/.test(expression)) {
        return interaction.reply({ content: 'Please use only numbers and basic operators (+ - * / % ( )).', ephemeral: true });
      }

      try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${expression})`)();
        await interaction.reply(`🧮 \`${expression}\` = **${result}**`);
      } catch {
        await interaction.reply({ content: "That expression couldn't be calculated. Check your syntax.", ephemeral: true });
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('remindme')
      .setDescription('Set a quick personal reminder')
      .addIntegerOption(o => o.setName('minutes').setDescription('Minutes from now').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('What to remind you about').setRequired(true)),
    async execute(interaction) {
      const minutes = interaction.options.getInteger('minutes');
      const message = interaction.options.getString('message');

      if (minutes <= 0 || minutes > 60 * 24 * 7) {
        return interaction.reply({ content: 'Please choose between 1 minute and 1 week (10080 minutes).', ephemeral: true });
      }

      await interaction.reply(`⏰ Got it! I'll remind you in ${minutes} minute(s): "${message}"`);

      setTimeout(async () => {
        try {
          await interaction.user.send(`⏰ Reminder: ${message}`);
        } catch {
          await interaction.channel.send(`${interaction.user}, reminder: ${message}`);
        }
      }, minutes * 60 * 1000);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('uptime')
      .setDescription('View how long the bot has been online'),
    async execute(interaction) {
      const totalSeconds = Math.floor(interaction.client.uptime / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      await interaction.reply(`🕒 I've been online for **${days}d ${hours}h ${minutes}m ${seconds}s**.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('invite')
      .setDescription("Get the bot's invite link"),
    async execute(interaction) {
      const link = `https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`;
      await interaction.reply(`🔗 Invite me to your server: ${link}`);
    },
  },
];
