const {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
} = require("discord.js");
const mongoose = require("mongoose");
const fs = require("fs");
const dotenv = require("dotenv");
const http = require("http");

// Load environment variables
dotenv.config();

const TOKEN = process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI;

if (!TOKEN || !MONGO_URI) {
  console.error("❌ Missing environment variables: TOKEN or MONGO_URI.");
  process.exit(1);
}

// --- Keep-alive web server for Render ---
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is alive.\n");
  })
  .listen(process.env.PORT || 3000, () => {
    console.log("🌐 Keep-alive server running");
  });

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Load commands
client.commands = new Collection();
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command?.data?.name) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ Skipped command file: ${file}`);
  }
}

// Load interaction and message handlers
const interactionHandler = require("./events/interactionCreate");
const messageCreateHandler = require("./events/messageCreate");

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

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
      await interactionHandler.execute(interaction);
    }
  } catch (error) {
    console.error("❌ Error handling interaction:", error);
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

// Connect to MongoDB and login to Discord
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    return client.login(TOKEN);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });
