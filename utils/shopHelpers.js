const path = require("path");
const fs = require("fs");

const cardPrices = {
  1: 1700, // Common
  2: 2500, // Extra
  3: 3750, // Rare
  4: 5000, // Legendary
};

function getCardCost(rarity) {
  return cardPrices[rarity] || null;
}

function getRandomCardByRarity(rarity) {
  // Resolve absolute path to the Cards folder (adjust '..' if shopHelpers.js moves)
  const cardsDir = path.join(__dirname, "..", "Cards");

  let files;
  try {
    files = fs.readdirSync(cardsDir);
  } catch (err) {
    console.error(`Failed to read Cards directory:`, err);
    return null;
  }

  // Read all files starting with r{rarity} and ending with .png
  const filtered = files.filter((f) => f.startsWith(`r${rarity}`) && f.endsWith(".png"));
  if (filtered.length === 0) return null;

  // Return one random card filename as string
  return filtered[Math.floor(Math.random() * filtered.length)];
}

module.exports = { getCardCost, getRandomCardByRarity };
