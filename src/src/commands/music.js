const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const musicQueue = require('../music/queue');

function requireVoiceChannel(interaction) {
  const member = interaction.member;
  const voiceChannel = member.voice?.channel;
  if (!voiceChannel) {
    return null;
  }
  return voiceChannel;
}

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('play')
      .setDescription('Play a song or add it to the queue')
      .addStringOption(o => o.setName('query').setDescription('Song name or YouTube URL').setRequired(true)),
    async execute(interaction) {
      const voiceChannel = requireVoiceChannel(interaction);
      if (!voiceChannel) {
        return interaction.reply({ content: 'You need to be in a voice channel to use this.', ephemeral: true });
      }
      if (!musicQueue.isPlayAvailable()) {
        return interaction.reply({ content: "⚠️ Music playback isn't set up yet. Run `npm install play-dl @discordjs/voice` first.", ephemeral: true });
      }

      await interaction.deferReply();
      try {
        const query = interaction.options.getString('query');
        const { song, position } = await musicQueue.addSong(
          interaction.guild, voiceChannel, interaction.channel, query, interaction.user.tag
        );

        if (position === 1) {
          await interaction.editReply(`▶️ Now playing: **${song.title}**`);
