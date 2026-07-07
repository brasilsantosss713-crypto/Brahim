// Per-guild music queue manager built on @discordjs/voice.
// Audio is sourced via play-dl (supports YouTube search + streaming).

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice');

let play;
try {
  play = require('play-dl');
} catch {
  play = null;
}

// guildId -> queue state
const queues = new Map();

function getQueue(guildId) {
  return queues.get(guildId);
}

function createQueue(guild, voiceChannel, textChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer();
  connection.subscribe(player);

  const queue = {
    connection,
    player,
    textChannel,
    voiceChannel,
    songs: [], // { title, url, requestedBy }
    playing: false,
    loop: false, // loop current song
    loopQueue: false, // loop whole queue
    volume: 1,
  };

  player.on(AudioPlayerStatus.Idle, () => {
    if (queue.loop && queue.songs[0]) {
      playSong(guild.id, queue.songs[0]);
      return;
    }
    const finished = queue.songs.shift();
    if (queue.loopQueue && finished) queue.songs.push(finished);

    if (queue.songs.length > 0) {
      playSong(guild.id, queue.songs[0]);
    } else {
      queue.playing = false;
      setTimeout(() => {
        const q = getQueue(guild.id);
        if (q && !q.playing) {
          q.connection.destroy();
          queues.delete(guild.id);
        }
      }, 5 * 60 * 1000); // auto-leave after 5 min idle
    }
  });

  player.on('error', error => {
    console.error('Audio player error:', error);
    textChannel.send(`⚠️ Playback error: ${error.message}`).catch(() => {});
  });

  queues.set(guild.id, queue);
  return queue;
}

async function playSong(guildId, song) {
  const queue = getQueue(guildId);
  if (!queue || !song) return;

  if (!play) {
    queue.textChannel.send("⚠️ The `play-dl` package isn't installed. Run `npm install play-dl`.").catch(() => {});
    return;
  }

  try {
    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type || StreamType.Arbitrary,
      inlineVolume: true,
    });
    resource.volume?.setVolume(queue.volume);
    queue.player.play(resource);
    queue.playing = true;
    queue.currentResource = resource;
  } catch (err) {
    queue.textChannel.send(`⚠️ Couldn't play **${song.title}**: ${err.message}`).catch(() => {});
    queue.songs.shift();
    if (queue.songs.length > 0) playSong(guildId, queue.songs[0]);
  }
}

async function addSong(guild, voiceChannel, textChannel, query, requestedBy) {
  if (!play) {
    throw new Error("The 'play-dl' package isn't installed. Run `npm install play-dl`.");
  }

  let songInfo;
  if (play.yt_validate(query) === 'video') {
    const info = await play.video_info(query);
    songInfo = { title: info.video_details.title, url: info.video_details.url };
  } else {
    const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
    if (!results || results.length === 0) throw new Error('No results found for that search.');
    songInfo = { title: results[0].title, url: results[0].url };
  }

  const song = { ...songInfo, requestedBy };

  let queue = getQueue(guild.id);
  if (!queue) {
    queue = createQueue(guild, voiceChannel, textChannel);
  }

  queue.songs.push(song);

  if (!queue.playing) {
    await entersState(queue.connection, VoiceConnectionStatus.Ready, 15000);
    playSong(guild.id, queue.songs[0]);
  }

  return { song, position: queue.songs.length };
}

function destroyQueue(guildId) {
  const queue = getQueue(guildId);
  if (queue) {
    queue.player.stop();
    queue.connection.destroy();
    queues.delete(guildId);
  }
}

module.exports = {
  getQueue,
  createQueue,
  addSong,
  playSong,
  destroyQueue,
  isPlayAvailable: () => !!play,
};
