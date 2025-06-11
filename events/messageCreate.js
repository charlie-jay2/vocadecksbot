const User = require("../models/User");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// Card rarity drop weighting
const rarityWeights = {
  Common: 60,
  Extra: 20,
  Rare: 12,
  Legendary: 7,
  Untouched: 1,
};

function getRandomRarity() {
  const total = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (const [rarity, weight] of Object.entries(rarityWeights)) {
    if (rand < weight) return rarity;
    rand -= weight;
  }
  return "Common";
}

/**
 * Get a random card by rarity that the user doesn't have yet.
 * Returns null if no new card available.
 */
function getRandomNewCardByRarity(rarity, ownedCards) {
  const files = fs
    .readdirSync("./Cards")
    .filter(
      (file) =>
        file.startsWith(`r${rarity}_`) && !ownedCards.includes(file)
    );
  if (files.length === 0) return null;
  return files[Math.floor(Math.random() * files.length)];
}

function getXpForLevel(level) {
  return level * 100; // e.g., Level 1 = 100 XP, Level 2 = 200 XP, etc.
}

module.exports = async (client, message) => {
  try {
    if (message.author.bot) return;

    let user = await User.findOne({ userId: message.author.id });
    if (!user) {
      user = await User.create({ userId: message.author.id, cards: [], specialCards: [] });
    }

    // Earn 30 points per message
    user.points += 30;

    // Random XP every 2-3 messages
    user.messageCount = (user.messageCount || 0) + 1;
    if (user.messageCount >= Math.floor(Math.random() * 2) + 2) {
      user.xp += 1;
      user.messageCount = 0;

      const neededXp = getXpForLevel(user.level);

      if (user.xp >= neededXp) {
        user.xp = 0;
        user.level += 1;

        // Special level 200 handling
        if (user.level === 200) {
          user.points += 5000; // Big bonus points

          // Add special card "special.png" if not already owned
          const specialCardFile = "special.png";
          if (!user.specialCards.includes(specialCardFile)) {
            user.specialCards.push(specialCardFile);
          }

          // Create canvas and draw badge + text
          const canvasWidth = 700;
          const canvasHeight = 250;
          const canvas = createCanvas(canvasWidth, canvasHeight);
          const ctx = canvas.getContext("2d");

          ctx.fillStyle = "#0a0a0a";
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);

          // Load badge image from images/I.png
          const badgePath = path.join(__dirname, "..", "images", "I.png");
          const badge = await loadImage(badgePath);

          const badgeSize = 200;
          ctx.drawImage(badge, 20, (canvasHeight - badgeSize) / 2, badgeSize, badgeSize);

          ctx.fillStyle = "#FFD700"; // Gold color
          ctx.font = "bold 36px Sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";

          const textX = 180;
          const textY = canvasHeight / 2;

          // Use username (not mention)
          const username = message.author.username;

          const messageText = `🎉 ${username} You're now\nINSANE Level 200!\nYou're a legend!`;

          const lines = messageText.split("\n");
          lines.forEach((line, i) => {
            ctx.fillText(line, textX, textY + i * 40 - ((lines.length - 1) * 20));
          });

          const buffer = canvas.toBuffer();

          // Send announcement message in the same channel
          await message.channel.send(
            `🎉 **${username}** has reached **Level 200 (INSANE)** and earned **5000 points**! Congratulations!`
          );

          try {
            console.log(`[Level 200] Sending DM to ${message.author.tag}...`);
            const dmChannel = await message.author.createDM();

            // Send the special card image first
            const specialCardPath = path.join(__dirname, "..", "images", "special.png");
            await dmChannel.send({
              files: [{ attachment: specialCardPath, name: "special.png" }],
            });

            // Then send the canvas badge + text image
            await dmChannel.send({
              files: [{ attachment: buffer, name: "Level200_INSANE.png" }],
            });

            console.log(`[Level 200] DM sent successfully to ${message.author.tag}`);
          } catch (dmError) {
            console.error(`[Level 200] Failed to send DM to ${message.author.tag}:`, dmError);
          }

          await user.save();
          return;
        } else {
          user.points += 400;

          let cardMsg = "";

          // Card reward (only level <= 100)
          if (user.level <= 100 && Math.floor(Math.random() * 10) === 0) {
            const rarity = getRandomRarity();

            // Get random card not owned yet
            const card = getRandomNewCardByRarity(rarity, user.cards);

            if (card) {
              user.cards.push(card);
              cardMsg = `\n🃏 You also received a **${rarity} Card**!`;
              await message.channel.send({
                content: `🆙 <@${user.userId}> leveled up to **Level ${user.level}** and earned **400 points!**${cardMsg}`,
                files: [`./Cards/${card}`],
              });
            } else {
              // No new card found for this rarity, just send normal level up message
              await message.channel.send(
                `🆙 <@${user.userId}> leveled up to **Level ${user.level}** and earned **400 points!**`
              );
            }
          } else {
            await message.channel.send(
              `🆙 <@${user.userId}> leveled up to **Level ${user.level}** and earned **400 points!**`
            );
          }
        }

        await user.save();
        return;
      }
    }

    await user.save();
  } catch (err) {
    console.error("messageCreate error:", err);
  }
};
