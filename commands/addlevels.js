const { SlashCommandBuilder } = require("discord.js");
const User = require("../models/User");

const ALLOWED_USER_IDS = ["972599697229365278", "1324588968540504192"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addlevels")
    .setDescription("Add levels to a user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("User to add levels to")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of levels to add")
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
        content: "Please provide a positive number of levels to add.",
        ephemeral: true,
      });
    }

    let userData = await User.findOne({ userId: targetUser.id });
    if (!userData) {
      userData = new User({ userId: targetUser.id });
    }

    userData.level += amount;
    await userData.save();

    return interaction.reply({
      content: `Added ${amount} level(s) to ${targetUser.tag}. New level: ${userData.level}`,
      ephemeral: true,
    });
  },
};
