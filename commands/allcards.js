const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const CARDS_PER_PAGE = 4; // 2x2 layout

module.exports = {
  data: new SlashCommandBuilder()
    .setName("allcards")
    .setDescription("Show all cards in a 2x2 image grid (with names)"),

  async execute(interaction) {
    const cardsDir = path.join(__dirname, "..", "Cards");
    let cardFiles;
    try {
      cardFiles = fs.readdirSync(cardsDir).filter((f) => f.endsWith(".png"));
      if (cardFiles.length === 0) {
        return interaction.reply({
          content: "No cards found.",
          ephemeral: true,
        });
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "Error reading cards folder.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    return showPage(interaction, cardFiles, 0);
  },

  async handleButton(interaction) {
    if (!interaction.isButton()) return false;

    if (interaction.customId.startsWith("allcards_")) {
      await interaction.deferUpdate();

      const cardsDir = path.join(__dirname, "..", "Cards");
      let cardFiles;
      try {
        cardFiles = fs.readdirSync(cardsDir).filter((f) => f.endsWith(".png"));
        if (cardFiles.length === 0) {
          return interaction.editReply({
            content: "No cards found.",
            embeds: [],
            components: [],
          });
        }
      } catch (err) {
        console.error(err);
        return interaction.editReply({
          content: "Error reading cards folder.",
          embeds: [],
          components: [],
        });
      }

      const page = parseInt(interaction.customId.split("_")[1]);
      return showPage(interaction, cardFiles, page);
    }
    return false;
  },
};

async function showPage(interaction, cardFiles, page) {
  const totalPages = Math.ceil(cardFiles.length / CARDS_PER_PAGE);
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);

  const start = currentPage * CARDS_PER_PAGE;
  const pageCards = cardFiles.slice(start, start + CARDS_PER_PAGE);

  const attachments = pageCards.map((file) =>
    new AttachmentBuilder(path.join(__dirname, "..", "Cards", file)).setName(
      file
    )
  );

  const embed = new EmbedBuilder()
    .setTitle(`All Cards (Page ${currentPage + 1} / ${totalPages})`)
    .setColor("Purple");

  const imageFields = [];
  const nameFields = [];

  for (let i = 0; i < pageCards.length; i++) {
    const file = pageCards[i];
    const baseName = file.replace(".png", "");

    imageFields.push({
      name: "\u200B",
      value: `**Image ${i + 1}**`,
      inline: true,
    });
    nameFields.push({
      name: "\u200B",
      value: `\`${baseName}\``,
      inline: true,
    });
  }

  embed.addFields(imageFields).addFields(nameFields);

  const buttons = new ActionRowBuilder();
  if (currentPage > 0) {
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`allcards_${currentPage - 1}`)
        .setLabel("⬅ Previous")
        .setStyle(ButtonStyle.Secondary)
    );
  }
  if (currentPage < totalPages - 1) {
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`allcards_${currentPage + 1}`)
        .setLabel("Next ➡")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  const reply = await interaction.editReply({
    embeds: [embed],
    files: attachments,
    components: buttons.components.length > 0 ? [buttons] : [],
  });

  const updatedEmbed = EmbedBuilder.from(reply.embeds[0]);

  const sentAttachments = reply.attachments;
  const updatedImageFields = [];
  for (let i = 0; i < pageCards.length; i++) {
    const name = pageCards[i];
    const file = sentAttachments.find((f) => f.name === name);
    if (file) {
      updatedImageFields.push({
        name: "\u200B",
        value: `[‎](${file.url})`,
        inline: true,
      });
    }
  }

  const updatedNameFields = pageCards.map((file) => ({
    name: "\u200B",
    value: `\`${file.replace(".png", "")}\``,
    inline: true,
  }));

  updatedEmbed.setFields([...updatedImageFields, ...updatedNameFields]);

  await interaction.editReply({ embeds: [updatedEmbed] });
}
