const { SlashCommandBuilder } = require("discord.js");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const ALLOWED_USER_IDS = ["972599697229365278", "1324588968540504192"];

const rarityNameToNum = {
  Common: "1",
  Extra: "2",
  Rare: "3",
  Legendary: "4",
  Untouched: "5",
};

function getRandomCardByRarityNum(rarityNum) {
  const files = fs
    .readdirSync("./Cards")
    .filter((file) => file.startsWith(`r${rarityNum}`));
  return files.length > 0
    ? files[Math.floor(Math.random() * files.length)]
    : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("randomcard")
    .setDescription("Give a user a random card from specified rarity")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("User to give a random card to")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("rarity")
        .setDescription("Rarity of card to give")
        .setRequired(true)
        .addChoices(
          { name: "Common", value: "Common" },
          { name: "Extra", value: "Extra" },
          { name: "Rare", value: "Rare" },
          { name: "Legendary", value: "Legendary" },
          { name: "Untouched", value: "Untouched" }
        )
    ),

  async execute(interaction) {
    if (!ALLOWED_USER_IDS.includes(interaction.user.id)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("target");
    const rarityName = interaction.options.getString("rarity");

    const rarityNum = rarityNameToNum[rarityName];
    if (!rarityNum) {
      return interaction.reply({
        content: "Invalid rarity specified.",
        ephemeral: true,
      });
    }

    let userData = await User.findOne({ userId: targetUser.id });
    if (!userData) {
      userData = new User({ userId: targetUser.id, cards: [], specialCards: [] });
    }

    const card = getRandomCardByRarityNum(rarityNum);
    if (!card) {
      return interaction.reply({
        content: `No cards found for rarity: ${rarityName}.`,
        ephemeral: true,
      });
    }

    userData.cards.push(card);
    await userData.save();

    // Immediately reply ephemeral to acknowledge command
    await interaction.reply({
      content: "Sending random card...",
      ephemeral: true,
    });

    // Wait 2 seconds before sending the public message
    setTimeout(async () => {
      // Create canvas image to show card and message
      const canvasWidth = 600;
      const canvasHeight = 300;
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#121212";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Load card image
      const cardPath = path.join(__dirname, "..", "Cards", card);
      let cardImage;
      try {
        cardImage = await loadImage(cardPath);
      } catch (err) {
        console.error("Failed to load card image:", err);
        return interaction.followUp({
          content: "Failed to load the card image.",
          ephemeral: true,
        });
      }

      // Draw card image (scaled to max 200x200)
      const maxCardSize = 200;
      let cardWidth = cardImage.width;
      let cardHeight = cardImage.height;
      if (cardWidth > maxCardSize || cardHeight > maxCardSize) {
        const scale = Math.min(maxCardSize / cardWidth, maxCardSize / cardHeight);
        cardWidth = cardWidth * scale;
        cardHeight = cardHeight * scale;
      }
      ctx.drawImage(cardImage, 30, (canvasHeight - cardHeight) / 2, cardWidth, cardHeight);

      // Extract card name from filename (remove prefix like r1 and extension)
      // e.g. r1FireDragon.png => FireDragon
      const cardName = card
        .replace(/^r\d+/, "")
        .replace(/\.png$/i, "");

      // Write card name
      ctx.fillStyle = "#FFD700"; // Gold-ish
      ctx.font = "bold 28px Sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(cardName, 260, 80);

      // Write congrats message
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "22px Sans-serif";
      ctx.fillText(
        `🎉 Congrats, ${targetUser.username}!`,
        260,
        130
      );
      ctx.fillText(
        `You received a ${rarityName} card.`,
        260,
        160
      );
      ctx.fillText(
        `Your current level: ${userData.level}`,
        260,
        190
      );

      // Send the canvas as a public message and ping the user
      await interaction.channel.send({
        content: `${targetUser}, here is your random card!`,
        files: [{ attachment: canvas.toBuffer(), name: "randomcard.png" }],
      });
    }, 2000);
  },
};
