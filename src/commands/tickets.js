const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "ticketpanel",
  description: "Create ticket panel",

  async execute(message) {
    const channel = message.guild.channels.cache.get("CHANNEL_ID"); // 1527166816676220971

    const embed = new EmbedBuilder()
      .setTitle("Tickets")
      .setDescription("Open a ticket below")
      .setColor("Red");

    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("giveaway_claim")
          .setLabel("🎁 Giveaway Claim")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("partnership")
          .setLabel("🤝 Partnership")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("market")
          .setLabel("🛒 Market")
          .setStyle(ButtonStyle.Primary)
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("giveaway_sponsors")
          .setLabel("💰 Giveaway Sponsors")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("build_requests")
          .setLabel("🏗️ Build Requests")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("support")
          .setLabel("❓ General Support")
          .setStyle(ButtonStyle.Secondary)
      );

    await channel.send({
      embeds: [embed],
      components: [row1, row2]
    });

    message.reply("✅ Ticket panel created!");
  }
};
