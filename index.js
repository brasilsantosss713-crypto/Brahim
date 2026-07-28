require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "src", "commands");

if (!fs.existsSync(commandsPath)) {
  fs.mkdirSync(commandsPath, { recursive: true });
}

const commandFiles = fs.readdirSync(commandsPath)
  .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./src/commands/${file}`);

  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`Loaded ${command.data.name}`);
  }
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

  const commands = [...client.commands.values()]
    .map(cmd => cmd.data.toJSON());

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Commands deployed");
});

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);

    if (!interaction.replied) {
      await interaction.reply({
        content: "❌ Error running command",
        ephemeral: true
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
