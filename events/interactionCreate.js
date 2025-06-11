const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const allcardsCommand = require("../commands/allcards");
const { getRandomCardByRarity, getCardCost } = require("../utils/shopHelpers");
const tradeRequests = require("../tradeRequestsMap");
const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

const CARDS_PER_PAGE = 8;

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      if (interaction.customId.startsWith("trade_")) {
        const [_, action, tradeId] = interaction.customId.split("_");

        const trade = tradeRequests.get(tradeId);
        if (!trade) {
          return interaction.reply({
            content: "Oops! This trade isn't available anymore.",
            flags: 64,
          });
        }

        if (interaction.user.id !== trade.receiverId) {
          return interaction.reply({
            content: "You're not allowed to respond to this trade!",
            flags: 64,
          });
        }

        const sender = await User.findOne({ userId: trade.senderId });
        const receiver = await User.findOne({ userId: trade.receiverId });

        if (!sender || !receiver) {
          return interaction.reply({
            content: "Someone doesn't have a profile! How rude...",
            flags: 64,
          });
        }

        if (action === "accept") {
          if (!sender.cards.includes(trade.senderCard)) {
            return interaction.reply({
              content: `Trade failed: They don't own that card anymore! ${trade.senderCard}.`,
              flags: 64,
            });
          }

          if (!receiver.cards.includes(trade.receiverCard)) {
            return interaction.reply({
              content: `You don't have that card anymore! ${trade.receiverCard}.`,
              flags: 64,
            });
          }

          sender.cards = sender.cards.filter((c) => c !== trade.senderCard);
          receiver.cards = receiver.cards.filter(
            (c) => c !== trade.receiverCard
          );

          sender.cards.push(trade.receiverCard);
          receiver.cards.push(trade.senderCard);

          await sender.save();
          await receiver.save();

          try {
            await interaction.update({
              content: `You accepted the trade! You gave **${trade.receiverCard}** and are now the proud owner of **${trade.senderCard}**.`,
              components: [],
              embeds: [],
            });

            const senderUser = await interaction.client.users.fetch(
              sender.userId
            );
            await senderUser.send(
              `Your trade request to **<@${receiver.userId}>** has been accepted! You traded your **${trade.senderCard}** for their **${trade.receiverCard}**, kawai!.`
            );
          } catch (e) {
            console.error("Error notifying sender of trade acceptance", e);
          }

          tradeRequests.delete(tradeId);
          return;
        }

        if (action === "decline") {
          await interaction.update({
            content: `You declined the trade request.`,
            components: [],
            embeds: [],
          });

          const senderUser = await interaction.client.users.fetch(
            trade.senderId
          );
          await senderUser.send(
            `Your trade request to <@${trade.receiverId}> has been declined.`
          );

          tradeRequests.delete(tradeId);
          return;
        }
      }

      if (!interaction.isButton()) return;

      const rarityMap = {
        buy_common: 1,
        buy_extra: 2,
        buy_rare: 3,
        buy_legendary: 4,
      };

      if (rarityMap[interaction.customId]) {
        const rarity = rarityMap[interaction.customId];

        const userData = await User.findOne({ userId: interaction.user.id });
        if (!userData)
          return interaction.reply({
            content: "I couldn't find any data for that user!",
            flags: 64,
          });

        const cost = getCardCost(rarity);
        if (userData.points < cost) {
          return interaction.reply({
            content: `You need ${cost} points to buy this card, keep at it!`,
            flags: 64,
          });
        }

        const cardFile = getRandomCardByRarity(rarity);
        if (!cardFile) {
          return interaction.reply({
            content:
              "Oops! Looks like you already own every card in this rarity. Or there is none left!",
            flags: 64,
          });
        }

        userData.points -= cost;
        userData.cards.push(cardFile);
        await userData.save();

        const image = new AttachmentBuilder(
          path.join(__dirname, "..", "Cards", cardFile)
        );

        return interaction.reply({
          content: `You bought a **${
            ["Common", "Extra", "Rare", "Legendary"][rarity - 1]
          }** card!`,
          files: [image],
          flags: 64,
        });
      }

      // Show Cards with Pagination
      if (interaction.customId.startsWith("show_cards_")) {
        const parts = interaction.customId.split("_");
        const rarityKey = parts[2];
        const page = parseInt(parts[3], 10) || 0;

        const rarityNameMap = {
          common: 1,
          extra: 2,
          rare: 3,
          legendary: 4,
          all: 0,
        };

        const rarity = rarityNameMap[rarityKey];
        if (rarity === undefined) {
          return interaction.reply({
            content: "Invalid rarity key.",
            flags: 64,
          });
        }

        const userData = await User.findOne({ userId: interaction.user.id });
        if (!userData)
          return interaction.reply({
            content: "User data not found.",
            flags: 64,
          });

        let cards =
          rarity === 0
            ? userData.cards
            : userData.cards.filter((c) =>
                new RegExp(`^r${rarity}`, "i").test(c)
              );

        const specialCardPatterns = ["special", "untouched", "insane"];
        cards = cards.filter(
          (c) =>
            !specialCardPatterns.some((pattern) =>
              c.toLowerCase().includes(pattern)
            )
        );

        if (cards.length === 0) {
          return interaction.reply({
            content: `You have no ${rarityKey} cards.`,
            flags: 64,
          });
        }

        const cardsPerRow = 4;
        const rows = 2;
        const cardWidth = 300;
        const cardHeight = 400;
        const textHeight = 40;

        const cardsPerPage = cardsPerRow * rows;
        const totalPages = Math.ceil(cards.length / cardsPerPage);
        const currentPage = Math.max(0, Math.min(page, totalPages - 1));
        const start = currentPage * cardsPerPage;
        const pageCards = cards.slice(start, start + cardsPerPage);

        const canvas = createCanvas(
          cardsPerRow * cardWidth,
          rows * (cardHeight + textHeight)
        );
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const username = interaction.user.username;

        for (let i = 0; i < pageCards.length; i++) {
          const cardFile = pageCards[i];
          const imagePath = path.join(__dirname, "..", "Cards", cardFile);
          const image = await loadImage(imagePath);
          const x = (i % cardsPerRow) * cardWidth;
          const y = Math.floor(i / cardsPerRow) * (cardHeight + textHeight);

          ctx.drawImage(image, x, y, cardWidth, cardHeight);

          ctx.fillStyle = "white";
          ctx.font = "24px sans-serif";
          ctx.textAlign = "center";

          const name = cardFile.replace(/\.[^/.]+$/, "");
          ctx.fillText(name, x + cardWidth / 2, y + cardHeight + 30);
        }

        const buffer = canvas.toBuffer("image/png");
        const attachment = new AttachmentBuilder(buffer, {
          name: "cards.png",
        });

        const row = new ActionRowBuilder();

        if (currentPage > 0) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`show_cards_${rarityKey}_${currentPage - 1}`)
              .setLabel("Previous")
              .setStyle(ButtonStyle.Primary)
          );
        }

        if (currentPage < totalPages - 1) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`show_cards_${rarityKey}_${currentPage + 1}`)
              .setLabel("Next")
              .setStyle(ButtonStyle.Primary)
          );
        }

        return interaction.reply({
          files: [attachment],
          components: row.components.length > 0 ? [row] : [],
          flags: 64,
        });
      }

      if (interaction.customId.startsWith("allcards_")) {
        const handled = await allcardsCommand.handleButton(interaction);
        if (handled) return;
      }

      return interaction.reply({
        content: "Unknown button pressed.",
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "An error occurred processing your interaction.",
          ephemeral: true,
        });
      }
    }
  },
};
