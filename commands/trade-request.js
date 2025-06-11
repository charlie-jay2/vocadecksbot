const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const path = require("path");
const User = require("../models/User");
const { v4: uuidv4 } = require("uuid");

const tradeRequests = require("../tradeRequestsMap"); // your shared Map

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trade-request")
    .setDescription("Request to trade cards with another user")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to trade with").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("yourcard").setDescription("Your card to offer").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("theircard").setDescription("Card you want").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const senderId = interaction.user.id;
    const receiverUser = interaction.options.getUser("user");
    const receiverId = receiverUser.id;

    // Add .png extension if missing
    let yourCard = interaction.options.getString("yourcard");
    if (!yourCard.toLowerCase().endsWith(".png")) yourCard += ".png";

    let theirCard = interaction.options.getString("theircard");
    if (!theirCard.toLowerCase().endsWith(".png")) theirCard += ".png";

    // Strip .png for display purposes
    const yourCardDisplay = yourCard.replace(/\.png$/i, "");
    const theirCardDisplay = theirCard.replace(/\.png$/i, "");

    if (receiverId === senderId) {
      return interaction.editReply({
        content: "You cannot trade with yourself.",
      });
    }

    // Fetch users from DB
    const sender = await User.findOne({ userId: senderId });
    const receiver = await User.findOne({ userId: receiverId });

    if (!sender || !receiver) {
      return interaction.editReply({
        content: "One or both users do not have profiles.",
      });
    }

    // Check sender owns the card
    if (!sender.cards.includes(yourCard)) {
      return interaction.editReply({
        content: `You do not own the card "${yourCardDisplay}".`,
      });
    }

    // Check receiver owns the card
    if (!receiver.cards.includes(theirCard)) {
      return interaction.editReply({
        content: `${receiverUser.username} does not own the card "${theirCardDisplay}".`,
      });
    }

    // Generate trade ID and save in shared map
    const tradeId = uuidv4();
    tradeRequests.set(tradeId, {
      senderId,
      receiverId,
      senderCard: yourCard,
      receiverCard: theirCard,
    });

    // Send DM to receiver
    try {
      const dmChannel = await receiverUser.createDM();

      const embed = new EmbedBuilder()
        .setTitle("Trade Request")
        .setDescription(
          `<@${interaction.user.id}> would like to offer their **${yourCardDisplay}** for your **${theirCardDisplay}**.\n\nHow about it?`
        )
        .setColor("Blue");

      // Attach both card images as files
      const yourCardAttachment = new AttachmentBuilder(
        path.join(__dirname, "..", "Cards", yourCard)
      ).setName(yourCard);

      const theirCardAttachment = new AttachmentBuilder(
        path.join(__dirname, "..", "Cards", theirCard)
      ).setName(theirCard);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`trade_accept_${tradeId}`)
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`trade_decline_${tradeId}`)
          .setLabel("Decline")
          .setStyle(ButtonStyle.Danger)
      );

      await dmChannel.send({
        embeds: [embed],
        components: [buttons],
        files: [yourCardAttachment, theirCardAttachment],
      });

      await interaction.editReply({
        content: `Trade request sent to ${receiverUser.tag}.`,
      });
    } catch (e) {
      console.error(e);
      return interaction.editReply({
        content: "Oops! I couldn't send that trade, they may have their DMs disabled!",
      });
    }
  },
};
