const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const User = require("../models/User");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your profile with level, points, and cards"),

  async execute(interaction) {
    const userData = await User.findOne({ userId: interaction.user.id });
    if (!userData) {
      return interaction.reply({
        content: "Someone doesn't have a profile! How rude...",
        flags: 64, // Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Profile`)
      .setColor("Blue")
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "Level", value: userData.level.toString(), inline: true },
        { name: "Points", value: userData.points.toString(), inline: true },
        {
          name: "Cards Owned",
          value: userData.cards.length.toString(),
          inline: true,
        }
      )
      .setFooter({ text: "Click the button below to view your cards." });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("show_cards_all_0") // Show all cards, page 0
        .setLabel("Show Cards")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [buttons],
      flags: 64,
    });
  },
};
