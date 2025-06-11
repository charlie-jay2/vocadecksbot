const { SlashCommandBuilder } = require("discord.js");
const User = require("../models/User");

const ALLOWED_USER_IDS = ["972599697229365278", "1324588968540504192"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resetdata")
    .setDescription("Reset level, points, and cards for a user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("User to reset data for")
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

    let userData = await User.findOne({ userId: targetUser.id });
    if (!userData) {
      return interaction.reply({
        content: `${targetUser.tag} has no data to reset.`,
        ephemeral: true,
      });
    }

    userData.level = 1;
    userData.points = 0;
    userData.cards = [];
    await userData.save();

    return interaction.reply({
      content: `Reset data for ${targetUser.tag}.`,
      ephemeral: true,
    });
  },
};
