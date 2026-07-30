require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { grantMessageXp } = require('./src/commands/leveling');
const { createTicketChannel, closeTicket, buildLeaderboardEmbed, buildLeaderboardRow } = require('./src/commands/tickets');
const { handleApplicationButtonClick, handleApplicationModalSubmit, handleApplicationDecision } = require('./src/commands/applications');
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
  client.user.setActivity('/help | SaharaBot', { type: 3 });
  await deployCommands();
});

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

  // Application "Apply for ___" buttons — opens the matching modal form
  if (interaction.isButton() && interaction.customId.startsWith('app_open_')) {
    try {
      await handleApplicationButtonClick(interaction);
    } catch (error) {
      console.error('Failed to open application modal:', error);
      await interaction.reply({ content: 'Something went wrong opening that form. Please try again.', ephemeral: true }).catch(() => {});
    }
    return;
  }

  // Application modal submissions
  if (interaction.isModalSubmit() && interaction.customId.startsWith('app_submit_')) {
    try {
      await handleApplicationModalSubmit(interaction);
    } catch (error) {
      console.error('Failed to handle application modal submit:', error);
      await interaction.reply({ content: 'Something went wrong submitting your application. Please try again.', ephemeral: true }).catch(() => {});
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
    return;
  }

  // Mod leaderboard pagination
  if (interaction.isButton() && interaction.customId.startsWith('modlb_page_')) {
    const page = parseInt(interaction.customId.split('_')[2], 10);

    const allStats = store.getAllModStats();
    const sorted = Object.entries(allStats)
      .filter(([, s]) => s.closes > 0 || s.renames > 0)
      .sort((a, b) => (b[1].closes + b[1].renames) - (a[1].closes + a[1].renames));

    const usernames = {};
    await Promise.all(
      sorted.map(async ([id]) => {
        const user = await interaction.client.users.fetch(id).catch(() => null);
        usernames[id] = user ? user.username : null;
      })
    );

    const { embed, totalPages } = buildLeaderboardEmbed(sorted, page, usernames);
    const row = buildLeaderboardRow(page, totalPages);

    await interaction.update({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    return;
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

    await interaction.update({ components: [claime
