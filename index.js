const {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
} = require("discord.js");
const mongoose = require("mongoose");
const messageCreateHandler = require("./events/messageCreate");
require("dotenv").config();
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Import your interactionCreate event handler
const interactionHandler = require("./events/interactionCreate");

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setActivity({
    name: "people play VocaDecks",
    type: ActivityType.Watching,
  });
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    } else if (interaction.isButton()) {
      // Pass button interactions to your button handler
      await interactionHandler.execute(interaction);
    }
  } catch (error) {
    console.error(error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "There was an error handling this interaction.",
        ephemeral: true,
      });
    }
  }
});

client.on("messageCreate", (message) => {
  messageCreateHandler(client, message);
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    client.login(process.env.TOKEN);
  })
  .catch((err) => console.error(err));
