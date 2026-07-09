const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const store = require('../data/store');

const activeGiveaways = new Map(); // messageId -> { prize, winnerCount, endsAt, channelId, entrants: Set, collector }
const endedGiveaways = new Map(); // messageId -> { prize, entrants: Set } — kept around so /giveawayreroll still works after it ends

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('poll')
      .setDescription('Create a yes/no community poll')
      .addStringOption(o => o.setName('question').setDescription('The poll question').setRequired(true)),
    async execute(interaction) {
      const question = interaction.options.getString('question');
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('📊 Poll')
        .setDescription(question)
        .setFooter({ text: `Started by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
      const message = await interaction.fetchReply();
      await message.react('👍');
      await message.react('👎');
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('communityvote')
      .setDescription('Create a multiple-choice vote (up to 4 options)')
      .addStringOption(o => o.setName('question').setDescription('The question').setRequired(true))
      .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
      .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
      .addStringOption(o => o.setName('option3').setDescription('Option 3'))
      .addStringOption(o => o.setName('option4').setDescription('Option 4')),
    async execute(interaction) {
      const question = interaction.options.getString('question');
      const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
      const options = [1, 2, 3, 4]
        .map(n => interaction.options.getString(`option${n}`))
        .filter(Boolean);

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🗳️ Community Vote')
        .setDescription(`${question}\n\n${options.map((o, i) => `${numberEmojis[i]} ${o}`).join('\n')}`)
        .setFooter({ text: `Started by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
      const message = await interaction.fetchReply();
      for (let i = 0; i < options.length; i++) {
        await message.react(numberEmojis[i]);
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('suggestion')
      .setDescription('Submit a suggestion for the server')
      .addStringOption(o => o.setName('idea').setDescription('Your suggestion').setRequired(true)),
    async execute(interaction) {
      const idea = interaction.options.getString('idea');
      const settings = store.getSettings(interaction.guild.id);
      const channel = settings.suggestionsChannelId
        ? interaction.guild.channels.cache.get(settings.suggestionsChannelId)
        : interaction.channel;

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('💡 New Suggestion')
        .setDescription(idea)
        .setFooter({ text: `Suggested by ${interaction.user.tag}` })
        .setTimestamp();

      const message = await channel.send({ embeds: [embed] });
      await message.react('👍');
      await message.react('👎');

      await interaction.reply({ content: `✅ Suggestion posted in ${channel}!`, ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('giveaway')
      .setDescription('Start a giveaway')
      .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of winners (default 1)'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const prize = interaction.options.getString('prize');
      const minutes = interaction.options.getInteger('minutes');
      const winnerCount = interaction.options.getInteger('winners') || 1;
      const endsAt = Date.now() + minutes * 60 * 1000;
      const entrants = new Set();

      const buildEmbed = () =>
        new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle(`🎉 ${prize}`)
          .addFields(
            { name: 'Winners', value: `${winnerCount}`, inline: true },
            { name: 'Entries', value: `${entrants.size}`, inline: true },
            { name: 'Hosted By', value: `${interaction.user}`, inline: true },
            { name: 'Ends', value: `<t:${Math.floor(endsAt / 1000)}:R> • <t:${Math.floor(endsAt / 1000)}:F>` },
          );

      const button = new ButtonBuilder().setCustomId('giveaway_enter').setLabel('🎉 Enter Giveaway').setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder().addComponents(button);

      await interaction.reply({ embeds: [buildEmbed()], components: [row] });
      const message = await interaction.fetchReply();

      const giveaway = { prize, winnerCount, endsAt, channelId: interaction.channel.id, entrants };
      activeGiveaways.set(message.id, giveaway);

      const collector = message.createMessageComponentCollector({ time: minutes * 60 * 1000 });
      giveaway.collector = collector;

      collector.on('collect', async i => {
        if (i.customId !== 'giveaway_enter') return;

        if (entrants.has(i.user.id)) {
          entrants.delete(i.user.id);
          await i.reply({ content: '❌ You left the giveaway.', ephemeral: true });
        } else {
          entrants.add(i.user.id);
          await i.reply({ content: '✅ You entered the giveaway! Good luck!', ephemeral: true });
        }

        await message.edit({ embeds: [buildEmbed()] }).catch(() => {});
      });

      collector.on('end', () => endGiveaway(interaction.client, message.id));
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('giveawayend')
      .setDescription('End a giveaway early')
      .addStringOption(o => o.setName('messageid').setDescription('The giveaway message ID').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const messageId = interaction.options.getString('messageid');
      const giveaway = activeGiveaways.get(messageId);
      if (!giveaway) {
        return interaction.reply({ content: "That giveaway isn't active (or already ended).", ephemeral: true });
      }
      giveaway.collector?.stop();
      await interaction.reply({ content: '✅ Giveaway ended early.', ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('giveawayreroll')
      .setDescription('Reroll a winner for a finished giveaway')
      .addStringOption(o => o.setName('messageid').setDescription('The giveaway message ID').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const messageId = interaction.options.getString('messageid');
      const ended = endedGiveaways.get(messageId);

      if (!ended || ended.entrants.size === 0) {
        return interaction.reply({ content: 'No entrants found for that giveaway (it may still be running, or had no entries).', ephemeral: true });
      }

      const pool = Array.from(ended.entrants);
      const winnerId = pool[Math.floor(Math.random() * pool.length)];
      await interaction.reply(`🔄 New winner for **${ended.prize}**: <@${winnerId}>! Congratulations!`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('event')
      .setDescription('Announce a community event')
      .addStringOption(o => o.setName('name').setDescription('Event name').setRequired(true))
      .addStringOption(o => o.setName('when').setDescription('When is it? e.g. "Saturday 6PM EST"').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Event details')),
    async execute(interaction) {
      const name = interaction.options.getString('name');
      const when = interaction.options.getString('when');
      const description = interaction.options.getString('description') || 'No additional details.';

      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`📅 ${name}`)
        .addFields({ name: 'When', value: when }, { name: 'Details', value: description })
        .setFooter({ text: `Organized by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('countdown')
      .setDescription('Count down to a specific date')
      .addStringOption(o => o.setName('date').setDescription('Target date, e.g. 2026-12-25').setRequired(true))
      .addStringOption(o => o.setName('label').setDescription('What is this countdown for?')),
    async execute(interaction) {
      const dateStr = interaction.options.getString('date');
      const label = interaction.options.getString('label') || 'Countdown';
      const target = new Date(dateStr);

      if (isNaN(target.getTime())) {
        return interaction.reply({ content: 'Please provide a valid date, e.g. `2026-12-25`.', ephemeral: true });
      }

      const timestamp = Math.floor(target.getTime() / 1000);
      await interaction.reply(`⏳ **${label}**: <t:${timestamp}:F> (<t:${timestamp}:R>)`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('application')
      .setDescription('Submit a staff/role application')
      .addStringOption(o => o.setName('role').setDescription('What role are you applying for?').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Why should you be picked?').setRequired(true)),
    async execute(interaction) {
      const role = interaction.options.getString('role');
      const reason = interaction.options.getString('reason');
      const settings = store.getSettings(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle('📋 New Application')
        .addFields(
          { name: 'Applicant', value: interaction.user.tag },
          { name: 'Applying For', value: role },
          { name: 'Reason', value: reason },
        )
        .setTimestamp();

      const channel = settings.modLogChannelId
        ? interaction.guild.channels.cache.get(settings.modLogChannelId)
        : interaction.channel;

      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ Your application has been submitted!', ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('verify')
      .setDescription('Verify yourself to gain access to the server'),
    async execute(interaction) {
      const settings = store.getSettings(interaction.guild.id);
      if (!settings.verifyRoleId) {
        return interaction.reply({ content: 'Verification is not set up yet. Ask an admin to configure it.', ephemeral: true });
      }

      const member = interaction.member;
      if (member.roles.cache.has(settings.verifyRoleId)) {
        return interaction.reply({ content: "You're already verified!", ephemeral: true });
      }

      await member.roles.add(settings.verifyRoleId);
      await interaction.reply({ content: '✅ You are now verified! Welcome to the server.', ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('introduce')
      .setDescription('Post an introduction template for new members'),
    async execute(interaction) {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('👋 Introduce Yourself!')
        .setDescription('**Name/Nickname:**\n**Where are you from:**\n**Hobbies/Interests:**\n**Favorite game/show:**\n**Fun fact:**');
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('birthday')
      .setDescription('Set or view a birthday')
      .addStringOption(o => o.setName('date').setDescription('Your birthday as MM-DD, e.g. 03-25 (leave blank to view)'))
      .addUserOption(o => o.setName('user').setDescription('View someone else\'s birthday')),
    async execute(interaction) {
      const date = interaction.options.getString('date');
      const targetUser = interaction.options.getUser('user');

      if (date) {
        if (!/^\d{2}-\d{2}$/.test(date)) {
          return interaction.reply({ content: 'Please use MM-DD format, e.g. `03-25`.', ephemeral: true });
        }
        store.setBirthday(interaction.user.id, date);
        return interaction.reply(`🎂 Your birthday has been set to **${date}**.`);
      }

      const lookupUser = targetUser || interaction.user;
      const stored = store.getBirthday(lookupUser.id);
      await interaction.reply(
        stored ? `🎂 **${lookupUser.username}**'s birthday is **${stored}**.` : `${lookupUser.username} hasn't set a birthday yet.`
      );
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('shoutout')
      .setDescription('Give a shoutout to another member')
      .addUserOption(o => o.setName('user').setDescription('Who to shout out').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Why are they awesome?').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      const embed = new EmbedBuilder()
        .setColor(0xE91E63)
        .setTitle('📣 Shoutout!')
        .setDescription(`${interaction.user} wants to give a shoutout to ${user}!\n\n**Reason:** ${reason}`);
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('feedback')
      .setDescription('Submit feedback about the server')
      .addStringOption(o => o.setName('message').setDescription('Your feedback').setRequired(true)),
    async execute(interaction) {
      const message = interaction.options.getString('message');
      const settings = store.getSettings(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle('📝 New Feedback')
        .setDescription(message)
        .setFooter({ text: `From ${interaction.user.tag}` })
        .setTimestamp();

      const channel = settings.modLogChannelId
        ? interaction.guild.channels.cache.get(settings.modLogChannelId)
        : interaction.channel;

      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ Thanks for the feedback!', ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('rules')
      .setDescription('View or set the server rules')
      .addStringOption(o => o.setName('text').setDescription('New rules text (admins only, leave blank to view)')),
    async execute(interaction) {
      const text = interaction.options.getString('text');
      const settings = store.getSettings(interaction.guild.id);

      if (text) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: "You don't have permission to set the rules.", ephemeral: true });
        }
        settings.rules = text;
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply('✅ Server rules updated.');
      }

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('📜 Server Rules')
        .setDescription(settings.rules || 'No rules have been set yet.');
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('faq')
      .setDescription('View or manage frequently asked questions')
      .addStringOption(o =>
        o.setName('action').setDescription('View, add, or remove').addChoices(
          { name: 'View', value: 'view' }, { name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' },
        )
      )
      .addStringOption(o => o.setName('question').setDescription('The question (for add/remove)'))
      .addStringOption(o => o.setName('answer').setDescription('The answer (for add)')),
    async execute(interaction) {
      const action = interaction.options.getString('action') || 'view';
      const question = interaction.options.getString('question');
      const answer = interaction.options.getString('answer');
      const settings = store.getSettings(interaction.guild.id);

      if (action !== 'view' && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: "You don't have permission to manage the FAQ.", ephemeral: true });
      }

      if (action === 'add') {
        if (!question || !answer) return interaction.reply({ content: 'Please provide both a question and an answer.', ephemeral: true });
        settings.faq.push({ question, answer });
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply(`✅ Added FAQ entry: "${question}"`);
      }

      if (action === 'remove') {
        if (!question) return interaction.reply({ content: 'Please provide the question to remove.', ephemeral: true });
        settings.faq = settings.faq.filter(f => f.question !== question);
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply(`✅ Removed FAQ entry: "${question}"`);
      }

      if (settings.faq.length === 0) {
        return interaction.reply('No FAQ entries yet.');
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('❓ Frequently Asked Questions')
        .setDescription(settings.faq.map(f => `**Q: ${f.question}**\nA: ${f.answer}`).join('\n\n'));
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('socials')
      .setDescription("View or manage the server's social media links")
      .addStringOption(o => o.setName('action').setDescription('View or add').addChoices({ name: 'View', value: 'view' }, { name: 'Add', value: 'add' }))
      .addStringOption(o => o.setName('platform').setDescription('Platform name, e.g. Twitter'))
      .addStringOption(o => o.setName('url').setDescription('Link URL')),
    async execute(interaction) {
      const action = interaction.options.getString('action') || 'view';
      const platform = interaction.options.getString('platform');
      const url = interaction.options.getString('url');
      const settings = store.getSettings(interaction.guild.id);

      if (action === 'add') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: "You don't have permission to manage socials.", ephemeral: true });
        }
        if (!platform || !url) return interaction.reply({ content: 'Please provide both a platform and a URL.', ephemeral: true });
        settings.socials.push({ platform, url });
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply(`✅ Added ${platform}.`);
      }

      if (settings.socials.length === 0) return interaction.reply('No social links configured yet.');

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🔗 Follow Us!')
        .setDescription(settings.socials.map(s => `**${s.platform}:** ${s.url}`).join('\n'));
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('spotlight')
      .setDescription('Spotlight a member of the community')
      .addUserOption(o => o.setName('user').setDescription('Who to spotlight').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Why are they being spotlighted?').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      const embed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('🌟 Community Spotlight')
        .setThumbnail(user.displayAvatarURL())
        .setDescription(`This week we're spotlighting ${user}!\n\n${reason}`);
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('affiliates')
      .setDescription("View or manage the server's affiliated communities")
      .addStringOption(o => o.setName('action').setDescription('View or add').addChoices({ name: 'View', value: 'view' }, { name: 'Add', value: 'add' }))
      .addStringOption(o => o.setName('name').setDescription('Affiliate server name'))
      .addStringOption(o => o.setName('url').setDescription('Invite link')),
    async execute(interaction) {
      const action = interaction.options.getString('action') || 'view';
      const name = interaction.options.getString('name');
      const url = interaction.options.getString('url');
      const settings = store.getSettings(interaction.guild.id);

      if (action === 'add') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: "You don't have permission to manage affiliates.", ephemeral: true });
        }
        if (!name || !url) return interaction.reply({ content: 'Please provide both a name and a URL.', ephemeral: true });
        settings.affiliates.push({ name, url });
        store.setSettings(interaction.guild.id, settings);
        return interaction.reply(`✅ Added affiliate: ${name}.`);
      }

      if (settings.affiliates.length === 0) return interaction.reply('No affiliated servers listed yet.');

      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🤝 Affiliated Servers')
        .setDescription(settings.affiliates.map(a => `**${a.name}:** ${a.url}`).join('\n'));
      await interaction.reply({ embeds: [embed] });
    },
  },
];

async function endGiveaway(client, messageId) {
  const giveaway = activeGiveaways.get(messageId);
  if (!giveaway) return;
  activeGiveaways.delete(messageId);

  const entrants = Array.from(giveaway.entrants);
  endedGiveaways.set(messageId, { prize: giveaway.prize, entrants: new Set(entrants) });

  try {
    const channel = await client.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(messageId).catch(() => null);

    if (message) {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('giveaway_enter').setLabel('🎉 Giveaway Ended').setStyle(ButtonStyle.Secondary).setDisabled(true)
      );
      await message.edit({ components: [disabledRow] }).catch(() => {});
    }

    if (entrants.length === 0) {
      return channel.send(`🎉 Giveaway for **${giveaway.prize}** ended, but nobody entered.`);
    }

    const winners = [];
    const pool = [...entrants];
    for (let i = 0; i < Math.min(giveaway.winnerCount, pool.length); i++) {
      const index = Math.floor(Math.random() * pool.length);
      winners.push(pool.splice(index, 1)[0]);
    }

    await channel.send(`🎉 Congratulations ${winners.map(id => `<@${id}>`).join(', ')}! You won **${giveaway.prize}**!`);
  } catch (err) {
    console.error('Failed to end giveaway:', err);
  }
    }
