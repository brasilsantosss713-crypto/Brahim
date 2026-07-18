require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { grantMessageXp } = require('./src/commands/leveling');
const { createTicketChannel, closeTicket } = require('./src/commands/tickets');
const store = require('./src/data/store');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
});

client.commands = new Collection();

// Load every command module in src/commands and register them by name.
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const commandModule = require(path.join(commandsPath, file));
  const list = Array.isArray(commandModule) ? commandModule : commandModule.commands;
  for (const command of list) {
    client.commands.set(command.data.name, command);
  }
}

console.log(`Loaded ${client.commands.size} commands.`);

// Auto-register slash commands with Discord on every startup.
// This makes deployment self-contained — no separate "npm run deploy" step needed
// on hosts like Railway where you don't have shell access.
async function deployCommands() {
  const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
  if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error('Missing DISCORD_TOKEN or CLIENT_ID — cannot deploy commands.');
    return;
  }

  const commandsJson = [];
  for (const file of commandFiles) {
    const commandModule = require(path.join(commandsPath, file));
    const list = Array.isArray(commandModule) ? commandModule : commandModule.commands;
    for (const command of list) {
      commandsJson.push(command.data.toJSON());
    }
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    console.log(`Deploying ${commandsJson.length} slash commands...`);
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commandsJson });
      console.log(`✅ Deployed ${commandsJson.length} commands to guild ${GUILD_ID}.`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandsJson });
      console.log(`✅ Deployed ${commandsJson.length} commands globally (may take up to 1 hour to appear).`);
    }
  } catch (error) {
    console.error('Failed to deploy commands:', error);
  }
}

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity('/help | SaharaBot', { type: 3 }); // 3 = Watching
  await deployCommands();
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing /${interaction.commandName}:`, error);
      const errorMessage = { content: 'There was an error running that command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
    return;
  }

  // Ticket panel dropdown selections
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
    try {
      const settings = store.getSettings(interaction.guild.id);
      const categories = settings.ticketPanels[interaction.message.id];
      if (!categories) {
        return interaction.reply({ content: 'This ticket panel is no longer configured. Ask an admin to recreate it.', ephemeral: true });
      }

      const index = parseInt(interaction.values[0], 10);
      const category = categories[index]?.label || 'General';

      const existing = interaction.guild.channels.cache.find(
        c => c.topic && c.topic.startsWith(`ticket-owner:${interaction.user.id}`)
      );
      if (existing) {
        return interaction.reply({ content: `You already have an open ticket: ${existing}`, ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const channel = await createTicketChannel(interaction.guild, interaction.user, category, null);
      await interaction.editReply(`✅ Ticket created: ${channel}`);
    } catch (error) {
      console.error('Failed to open ticket from panel:', error);
      const errorMessage = { content: 'Something went wrong opening your ticket. Please try again or contact an admin.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage).catch(() => {});
      } else {
        await interaction.reply(errorMessage).catch(() => {});
      }
    }
  }

  // Ticket "Claim" button — any staff member with Manage Channels can claim
  if (interaction.isButton() && interaction.customId === 'ticket_claim') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: "You don't have permission to claim tickets.", ephemeral: true });
    }

    const message = interaction.message;
    const claimedRow = new ActionRowBuilder().addComponents(
      ButtonBuilder.from(message.components[0].components[0]).setLabel(`Claimed by ${interaction.user.username}`).setDisabled(true),
      ButtonBuilder.from(message.components[0].components[1]),
    );

    await interaction.update({ components: [claimedRow] });
    await interaction.channel.send(`🙋 This ticket has been claimed by ${interaction.user}.`);

    // Award 2 mod points for claiming.
    store.addModPoint(interaction.user.id, 2);

    // Rename the channel to reflect it's been claimed, e.g. ticket-alex -> claimed-alex
    const currentName = interaction.channel.name;
    const newName = currentName.startsWith('ticket-')
      ? currentName.replace('ticket-', 'claimed-')
      : `claimed-${currentName}`;
    await interaction.channel.setName(newName.slice(0, 100)).catch(() => {});

    return;
  }

  // Ticket "Close" button
  if (interaction.isButton() && interaction.customId === 'ticket_close') {
    const channel = interaction.channel;
    const ownerId = channel.topic?.split(':')[1];
    const isOwner = interaction.user.id === ownerId;
    const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!isOwner && !isStaff) {
      return interaction.reply({ content: "You don't have permission to close this ticket.", ephemeral: true });
    }

    await interaction.reply('🔒 Closing this ticket and generating a transcript...');
    await closeTicket(channel, interaction.user);
    return;
  }
});

// Passive leveling: grant XP for chat activity, announce level-ups.
// Also runs automod word filtering if enabled for the server.
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const settings = store.getSettings(message.guild.id);
  if (settings.automod.enabled && settings.automod.bannedWords.length > 0) {
    const content = message.content.toLowerCase();
    const matched = settings.automod.bannedWords.some(word => content.includes(word));
    if (matched) {
      await message.delete().catch(() => {});
      message.channel.send(`⚠️ ${message.author}, that message was removed by automod.`)
        .then(m => setTimeout(() => m.delete().catch(() => {}), 5000))
        .catch(() => {});
      return;
    }
  }

  const newLevel = grantMessageXp(message.author.id, message.guild.id);
  if (newLevel) {
    const announceChannel = newLevel.announceChannelId
      ? message.guild.channels.cache.get(newLevel.announceChannelId)
      : message.channel;

    if (announceChannel) {
      announceChannel.send(`🎉 ${message.author} just leveled up to **Level ${newLevel.level}**!`).catch(() => {});
    }

    if (newLevel.roleId) {
      const member = message.member;
      member?.roles.add(newLevel.roleId).catch(() => {});
    }
  }
});

// Welcome messages
client.on('guildMemberAdd', async member => {
  const settings = store.getSettings(member.guild.id);
  if (!settings.welcomeChannelId) return;

  const channel = member.guild.channels.cache.get(settings.welcomeChannelId);
  if (!channel) return;

  const text = settings.welcomeMessage
    .replace(/{user}/g, `${member}`)
    .replace(/{server}/g, member.guild.name);
  channel.send(text).catch(() => {});
});

// Goodbye messages
client.on('guildMemberRemove', async member => {
  const settings = store.getSettings(member.guild.id);
  if (!settings.goodbyeChannelId) return;

  const channel = member.guild.channels.cache.get(settings.goodbyeChannelId);
  if (!channel) return;

  const text = settings.goodbyeMessage
    .replace(/{user}/g, member.user.tag)
    .replace(/{server}/g, member.guild.name);
  channel.send(text).catch(() => {});
});

// Reaction roles — grant or remove a role when a user reacts/unreacts on a configured message
async function handleReactionRole(reaction, user, isAdd) {
  if (user.bot) return;
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }

  const guild = reaction.message.guild;
  if (!guild) return;

  const settings = store.getSettings(guild.id);
  const mapping = settings.reactionRoles[reaction.message.id];
  if (!mapping) return;

  const emojiKey = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
  const roleId = mapping[emojiKey] || mapping[reaction.emoji.name];
  if (!roleId) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  if (isAdd) {
    await member.roles.add(roleId).catch(() => {});
  } else {
    await member.roles.remove(roleId).catch(() => {});
  }
}

client.on('messageReactionAdd', (reaction, user) => handleReactionRole(reaction, user, true));
client.on('messageReactionRemove', (reaction, user) => handleReactionRole(reaction, user, false));

// Reminder scheduler — checks every 30 seconds for any reminders that are due,
// sends them (DM first, falls back to the original channel), then removes them.
// Polling like this (rather than one setTimeout per reminder) means reminders
// survive bot restarts, which matters on hosts like Railway.
setInterval(async () => {
  const due = store.getAllReminders().filter(r => r.remindAt <= Date.now());

  for (const reminder of due) {
    store.removeReminder(reminder.id);

    try {
      const user = await client.users.fetch(reminder.userId);
      const creator = reminder.createdBy !== reminder.userId ? await client.users.fetch(reminder.createdBy).catch(() => null) : null;
      const text = creator
        ? `⏰ Reminder from ${creator.tag}: ${reminder.message}`
        : `⏰ Reminder: ${reminder.message}`;

      await user.send(text).catch(async () => {
        const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
        if (channel) channel.send(`${user}, ${text}`).catch(() => {});
      });
    } catch (err) {
      console.error(`Failed to deliver reminder #${reminder.id}:`, err);
    }
  }
}, 30 * 1000);

client.login(process.env.DISCORD_TOKEN);
