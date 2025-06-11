const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("View the card shop and buy cards by rarity."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🛒 VocaDecks Card Shop")
      .setColor("Blue").setDescription(`
⬜ **Common Card** – 1,700 points  
🟩 **Extra Card** – 2,500 points  
🟦 **Rare Card** – 3,750 points  
🟪 **Legendary Card** – 5,000 points

> 🟧 **Untouched Cards cannot be purchased**

Pick which card you'd like to buy below!
      `);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_common")
        .setLabel("Buy Common Card")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("buy_extra")
        .setLabel("Buy Extra Card")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("buy_rare")
        .setLabel("Buy Rare Card")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("buy_legendary")
        .setLabel("Buy Legendary Card")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
