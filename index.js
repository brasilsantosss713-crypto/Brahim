async button(interaction) {

  // Giveaway join button
  if (interaction.customId === "giveaway_join") {

    const result = await pool.query(
      `SELECT id FROM giveaways WHERE message_id=$1`,
      [interaction.message.id]
    );

    if (!result.rows[0]) {
      return interaction.reply({
        content: "❌ Giveaway not found.",
        ephemeral: true
      });
    }

    try {

      await pool.query(
        `INSERT INTO giveaway_entries
        (giveaway_id,user_id)
        VALUES($1,$2)`,
        [
          result.rows[0].id,
          interaction.user.id
        ]
      );

      return interaction.reply({
        content: "🎉 You entered the giveaway!",
        ephemeral: true
      });

    } catch {

      return interaction.reply({
        content: "❌ You already entered!",
        ephemeral: true
      });

    }
  }


  // Prize claim button
  if (interaction.customId === "claim_prize") {

    const claimChannel =
      interaction.guild.channels.cache.get(
        "1519451768344285440"
      );

    if (!claimChannel) {
      return interaction.reply({
        content: "❌ Claim channel not found.",
        ephemeral: true
      });
    }


    await claimChannel.send({
      content:
      `🎟️ **Prize Claim Request**\n\n` +
      `👤 Winner: ${interaction.user}\n` +
      `🆔 User ID: ${interaction.user.id}\n\n` +
      `Staff, please verify and give the prize.`
    });


    return interaction.reply({
      content:
      "✅ Your prize claim has been sent to the giveaway staff!",
      ephemeral: true
    });
  }
}

const claimButton = new ButtonBuilder()
.setCustomId("claim_prize")
.setLabel("🎟️ Claim Prize")
.setStyle(ButtonStyle.Primary);

const claimRow = new ActionRowBuilder()
.addComponents(claimButton);

interaction.channel.send({
content:
`🎉 **Giveaway Ended!**\n`+
`🎁 Prize: **${prize}**\n`+
`🏆 Winner(s): ${selected.map(x=>`<@${x}>`).join(", ")}`,
components:[claimRow]
});
