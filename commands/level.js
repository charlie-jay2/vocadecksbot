const path = require("path");
const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("canvas"); // removed registerFont
const User = require("../models/User");

// Removed registerFont calls since no custom fonts used now

function getXpForLevel(level) {
  return level * 100;
}

function getBadgeImageName(level) {
  if (level >= 200) return "I.png";
  if (level >= 101) return "U.png";
  if (level >= 51) return "L.png";
  if (level >= 31) return "R.png";
  if (level >= 11) return "E.png";
  return "C.png";
}

function getBackgroundColor(level) {
  if (level >= 200) return "#800020"; // I: pure red
  if (level >= 101) return "#EDAD50"; // U: orange/gold
  if (level >= 51) return "#D27AF0"; // L: purple
  if (level >= 31) return "#1671D6"; // R: blue
  if (level >= 11) return "#11CB9A"; // E: greenish
  return "#f0f0f0"; // C: light gray
}

const badgeImages = new Map();

async function preloadBadgeImages() {
  const badgeFiles = ["I.png", "U.png", "L.png", "R.png", "E.png", "C.png"];
  for (const file of badgeFiles) {
    const badgePath = path.join(__dirname, "..", "Images", file);
    try {
      const img = await loadImage(badgePath);
      badgeImages.set(file, img);
    } catch (error) {
      console.error(
        `Failed to load badge image ${file} at path ${badgePath}:`,
        error
      );
      badgeImages.set(file, null);
    }
  }
}
preloadBadgeImages();

const fetch = require("node-fetch"); // add node-fetch dependency

async function generateProfileImage(userDiscord, userData) {
  const width = 600;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = getBackgroundColor(userData.level);
  ctx.fillRect(0, 0, width, height);

  let avatar = null;
  const avatarURL = userDiscord.displayAvatarURL({
    extension: "png",
    size: 128,
    forceStatic: true,
  });

  try {
    const response = await fetch(avatarURL, {
      headers: {
        "User-Agent": "DiscordBot (https://your.bot.url, v0.1)",
      },
    });
    if (!response.ok)
      throw new Error(`Failed to fetch avatar: ${response.status}`);
    const buffer = await response.buffer();
    avatar = await loadImage(buffer);
  } catch (err) {
    console.warn("Failed to load avatar image:", err.message);
  }

  if (avatar) {
    const avatarX = 80;
    const avatarY = height / 2;
    const avatarRadius = 60;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(
      avatar,
      avatarX - avatarRadius,
      avatarY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );
    ctx.restore();
  }

  // Username text color: white for level 200+, else #555
  ctx.fillStyle = userData.level >= 200 ? "#fff" : "#555";
  ctx.textBaseline = "middle";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(userDiscord.username, 160, 60);

  // Level, XP, Points text color: white for level 200+, else #555
  ctx.font = "22px sans-serif";
  ctx.fillStyle = userData.level >= 200 ? "#fff" : "#555";
  ctx.fillText(`Level: ${userData.level}`, 160, 100);
  ctx.fillText(
    `XP: ${userData.xp} / ${getXpForLevel(userData.level)}`,
    160,
    130
  );
  ctx.fillText(`Points: ${userData.points}`, 160, 160);

  // The bottom "Keep chatting..." text color: white for level 200+, else #555
  ctx.font = "18px sans-serif";
  ctx.fillStyle = userData.level >= 200 ? "#fff" : "#555";
  ctx.fillText("Keep chatting to level up further.", 160, 185);

  const badgeFile = getBadgeImageName(userData.level);
  const badgeImage = badgeImages.get(badgeFile);
  if (badgeImage) {
    const badgeSize = 100;
    ctx.drawImage(
      badgeImage,
      width - badgeSize - 30,
      height / 2 - badgeSize / 2,
      badgeSize,
      badgeSize
    );
  }

  return canvas.toBuffer("image/png");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("View your current level, XP, points, and rank badge."),

  async execute(interaction) {
    let user = await User.findOne({ userId: interaction.user.id });
    if (!user) {
      user = await User.create({ userId: interaction.user.id });
    }

    try {
      const imageBuffer = await generateProfileImage(interaction.user, user);
      const attachment = new AttachmentBuilder(imageBuffer, {
        name: "profile.png",
      });
      await interaction.reply({ files: [attachment], ephemeral: false });
    } catch (error) {
      console.error("[LevelCommand] Error generating profile image:", error);
      await interaction.reply({
        content: `Failed to generate profile image: ${error.message}`,
        flags: 36,
      });
    }
  },
};
