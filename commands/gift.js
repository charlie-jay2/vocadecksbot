const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const path = require("path");
const User = require("../models/User");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gift")
    .setDescription("Gift a card to another user with a message")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to gift to").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("card").setDescription("Your card to gift").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Message to send with the gift")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const senderId = interaction.user.id;
    const receiverUser = interaction.options.getUser("user");
    const receiverId = receiverUser.id;

    // Get card name, add .png if missing
    let cardToGift = interaction.options.getString("card");
    if (!cardToGift.toLowerCase().endsWith(".png")) {
      cardToGift += ".png";
    }

    const giftMessage = interaction.options.getString("message") || "You got a gift!";

    if (receiverId === senderId) {
      return interaction.editReply({
        content: "Baka! You can't give cards to yourself!",
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
    if (!sender.cards.includes(cardToGift)) {
      return interaction.editReply({
        content: `It looks like you don't have that card yet "${cardToGift.replace(".png", "")}".`,
      });
    }

    // Remove card from sender
    sender.cards = sender.cards.filter((c) => c !== cardToGift);

    // Add card to receiver
    receiver.cards.push(cardToGift);

    await sender.save();
    await receiver.save();

    // Send DM to receiver
    try {
      const dmChannel = await receiverUser.createDM();

      const embed = new EmbedBuilder()
        .setTitle(`Mite, mite! You got a gift from ${interaction.user.username}!`)
        .setDescription(giftMessage)
        .setColor("Green")
        .setFooter({ text: `Gifted card: ${cardToGift.replace(".png", "")}` });

      const cardAttachment = new AttachmentBuilder(
        path.join(__dirname, "..", "Cards", cardToGift)
      ).setName(cardToGift);

      await dmChannel.send({
        embeds: [embed],
        files: [cardAttachment],
      });

      await interaction.editReply({
        content: `You gifted **${cardToGift.replace(".png", "")}** to ${receiverUser.tag}!`,
      });
    } catch (e) {
      console.error(e);
      return interaction.editReply({
        content: "Oops! I couldn't send that gift, they may have their DMs disabled!",
      });
    }
  },
};
