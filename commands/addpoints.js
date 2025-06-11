const { SlashCommandBuilder } = require("discord.js");
const User = require("../models/User");

const ALLOWED_USER_IDS = ["972599697229365278", "1324588968540504192"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addpoints")
    .setDescription("Add points to a user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("User to add points to")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of points to add")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!ALLOWED_USER_IDS.includes(interaction.user.id)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("target");
    const amount = interaction.options.getInteger("amount");

    if (amount <= 0) {
      return interaction.reply({
        content: "Please provide a positive number of points to add.",
        ephemeral: true,
      });
    }

    let userData = await User.findOne({ userId: targetUser.id });
    if (!userData) {
      userData = new User({ userId: targetUser.id });
    }

    userData.points += amount;
    await userData.save();

    return interaction.reply({
      content: `Added ${amount} point(s) to ${targetUser.tag}. New points: ${userData.points}`,
      ephemeral: true,
    });
  },
};
