require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { grantMessageXp } = require('./src/commands/leveling');
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

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity('/help | SaharaBot', { type: 3 }); // 3 = Watching
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

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

  const newLevel = grantMessageXp(message.author.id);
  if (newLevel) {
    message.channel.send(`🎉 ${message.author} just leveled up to **Level ${newLevel}**!`).catch(() => {});
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

client.login(process.env.DISCORD_TOKEN);
