const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const EIGHTBALL_RESPONSES = [
  'It is certain.', 'Without a doubt.', 'Yes, definitely.', 'You may rely on it.',
  'As I see it, yes.', 'Most likely.', 'Outlook good.', 'Signs point to yes.',
  'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
  'Cannot predict now.', "Don't count on it.", 'My reply is no.',
  'My sources say no.', 'Outlook not so good.', 'Very doubtful.',
];

const TRIVIA_QUESTIONS = [
  { q: 'What planet is known as the Red Planet?', a: 'mars' },
  { q: 'What is the capital of Japan?', a: 'tokyo' },
  { q: 'How many continents are there on Earth?', a: '7' },
  { q: 'What is the largest ocean on Earth?', a: 'pacific' },
  { q: 'What element does "O" represent on the periodic table?', a: 'oxygen' },
];

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('coinflip')
      .setDescription('Flip a coin'),
    async execute(interaction) {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      await interaction.reply(`🪙 The coin landed on **${result}**!`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('diceroll')
      .setDescription('Roll a dice')
      .addIntegerOption(o => o.setName('sides').setDescription('Number of sides (default 6)')),
    async execute(interaction) {
      const sides = interaction.options.getInteger('sides') || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      await interaction.reply(`🎲 You rolled a **${result}** (out of ${sides}).`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('rps')
      .setDescription('Play Rock Paper Scissors against the bot')
      .addStringOption(o =>
        o.setName('choice')
          .setDescription('Your choice')
          .setRequired(true)
          .addChoices(
            { name: 'Rock', value: 'rock' },
            { name: 'Paper', value: 'paper' },
            { name: 'Scissors', value: 'scissors' },
          )
      ),
    async execute(interaction) {
      const choices = ['rock', 'paper', 'scissors'];
      const userChoice = interaction.options.getString('choice');
      const botChoice = choices[Math.floor(Math.random() * choices.length)];

      let result;
      if (userChoice === botChoice) result = "It's a tie!";
      else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) result = 'You win! 🎉';
      else result = 'I win! 🤖';

      await interaction.reply(`You chose **${userChoice}**, I chose **${botChoice}**. ${result}`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('8ball')
      .setDescription('Ask the Magic 8-Ball a question')
      .addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true)),
    async execute(interaction) {
      const question = interaction.options.getString('question');
      const response = EIGHTBALL_RESPONSES[Math.floor(Math.random() * EIGHTBALL_RESPONSES.length)];

      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🎱 Magic 8-Ball')
        .addFields(
          { name: 'Question', value: question },
          { name: 'Answer', value: response },
        );
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('trivia')
      .setDescription('Answer a trivia question'),
    async execute(interaction) {
      const question = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];

      const embed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('🧠 Trivia Time!')
        .setDescription(question.q)
        .setFooter({ text: 'Type your answer in the chat within 15 seconds!' });

      await interaction.reply({ embeds: [embed] });

      const filter = m => m.author.id === interaction.user.id;
      try {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
        const answer = collected.first().content.toLowerCase().trim();
        if (answer === question.a) {
          await interaction.followUp(`✅ Correct, ${interaction.user}! The answer was **${question.a}**.`);
        } else {
          await interaction.followUp(`❌ Not quite. The correct answer was **${question.a}**.`);
        }
      } catch {
        await interaction.followUp(`⏰ Time's up! The correct answer was **${question.a}**.`);
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('tictactoe')
      .setDescription('Play Tic-Tac-Toe against another user')
      .addUserOption(o => o.setName('opponent').setDescription('Who to challenge').setRequired(true)),
    async execute(interaction) {
      const opponent = interaction.options.getUser('opponent');
      if (opponent.bot || opponent.id === interaction.user.id) {
        return interaction.reply({ content: "You can't challenge a bot or yourself!", ephemeral: true });
      }

      const board = Array(9).fill(null);
      let currentPlayer = interaction.user;
      const players = { X: interaction.user, O: opponent };

      const renderBoard = () => {
        const rows = new ActionRowBuilder();
        const buttons = board.map((cell, i) =>
          new ButtonBuilder()
            .setCustomId(`ttt_${i}`)
            .setLabel(cell || '\u200b')
            .setStyle(cell === 'X' ? ButtonStyle.Danger : cell === 'O' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(!!cell)
        );
        const rowsArr = [];
        for (let i = 0; i < 9; i += 3) {
          rowsArr.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 3)));
        }
        return rowsArr;
      };

      const checkWinner = () => {
        const lines = [
          [0, 1, 2], [3, 4, 5], [6, 7, 8],
          [0, 3, 6], [1, 4, 7], [2, 5, 8],
          [0, 4, 8], [2, 4, 6],
        ];
        for (const [a, b, c] of lines) {
          if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        }
        return board.every(cell => cell) ? 'draw' : null;
      };

      const message = await interaction.reply({
        content: `${interaction.user} vs ${opponent} — it's **${currentPlayer.username}**'s turn (X).`,
        components: renderBoard(),
        fetchReply: true,
      });

      const collector = message.createMessageComponentCollector({ time: 5 * 60 * 1000 });

      collector.on('collect', async i => {
        const mark = currentPlayer === players.X ? 'X' : 'O';
        const symbol = currentPlayer.id === interaction.user.id ? 'X' : 'O';

        if (i.user.id !== currentPlayer.id) {
          return i.reply({ content: "It's not your turn!", ephemeral: true });
        }

        const index = parseInt(i.customId.split('_')[1], 10);
        if (board[index]) return i.reply({ content: 'That cell is taken!', ephemeral: true });

        board[index] = symbol;
        const winner = checkWinner();

        if (winner) {
          collector.stop();
          const resultText = winner === 'draw'
            ? "It's a draw!"
            : `${winner === 'X' ? players.X : players.O} wins! 🎉`;
          await i.update({ content: resultText, components: renderBoard() });
        } else {
          currentPlayer = currentPlayer.id === players.X.id ? players.O : players.X;
          await i.update({
            content: `${interaction.user} vs ${opponent} — it's **${currentPlayer.username}**'s turn.`,
            components: renderBoard(),
          });
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          await interaction.editReply({ content: 'Game timed out.', components: [] });
        }
      });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('guessnumber')
      .setDescription('Guess a number between 1 and 100'),
    async execute(interaction) {
      const target = Math.floor(Math.random() * 100) + 1;
      await interaction.reply("I'm thinking of a number between 1 and 100. You have 6 tries — type your guesses in chat!");

      let tries = 6;
      const filter = m => m.author.id === interaction.user.id && !isNaN(m.content);
      const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

      collector.on('collect', async m => {
        const guess = parseInt(m.content, 10);
        tries--;

        if (guess === target) {
          await m.reply(`🎉 Correct! The number was **${target}**.`);
          collector.stop();
        } else if (tries <= 0) {
          await m.reply(`💥 Out of tries! The number was **${target}**.`);
          collector.stop();
        } else {
          await m.reply(`${guess < target ? '📈 Higher!' : '📉 Lower!'} (${tries} tries left)`);
        }
      });
    },
  },
];
