const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const store = require('../data/store');

const DAILY_AMOUNT = 200;
const WORK_MIN = 50;
const WORK_MAX = 200;
const COOLDOWN_DAILY = 24 * 60 * 60 * 1000;
const COOLDOWN_WORK = 60 * 60 * 1000;

const JOBS = ['barista', 'developer', 'delivery driver', 'street musician', 'freelance artist', 'chef'];

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('balance')
      .setDescription('Check your coin balance')
      .addUserOption(o => o.setName('user').setDescription('Check someone else\'s balance')),
    async execute(interaction) {
      const target = interaction.options.getUser('user') || interaction.user;
      const econ = store.getEconomy(target.id);

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle(`💰 ${target.username}'s Balance`)
        .addFields(
          { name: 'Wallet', value: `${econ.balance} coins`, inline: true },
          { name: 'Bank', value: `${econ.bank} coins`, inline: true },
          { name: 'Net Worth', value: `${econ.balance + econ.bank} coins`, inline: true },
        );
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('daily')
      .setDescription('Claim your daily reward'),
    async execute(interaction) {
      const econ = store.getEconomy(interaction.user.id);
      const now = Date.now();

      if (now - econ.lastDaily < COOLDOWN_DAILY) {
        const remaining = COOLDOWN_DAILY - (now - econ.lastDaily);
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        return interaction.reply({ content: `⏳ You already claimed your daily reward. Try again in ${hours}h ${minutes}m.`, ephemeral: true });
      }

      econ.balance += DAILY_AMOUNT;
      econ.lastDaily = now;
      store.setEconomy(interaction.user.id, econ);

      await interaction.reply(`🎁 You claimed your daily reward of **${DAILY_AMOUNT} coins**! New balance: ${econ.balance}.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('work')
      .setDescription('Work a job to earn coins'),
    async execute(interaction) {
      const econ = store.getEconomy(interaction.user.id);
      const now = Date.now();

      if (now - econ.lastWork < COOLDOWN_WORK) {
        const remaining = COOLDOWN_WORK - (now - econ.lastWork);
        const minutes = Math.ceil(remaining / (60 * 1000));
        return interaction.reply({ content: `⏳ You're tired from your last shift. Try again in ${minutes} minute(s).`, ephemeral: true });
      }

      const job = JOBS[Math.floor(Math.random() * JOBS.length)];
      const earnings = Math.floor(Math.random() * (WORK_MAX - WORK_MIN + 1)) + WORK_MIN;

      econ.balance += earnings;
      econ.lastWork = now;
      store.setEconomy(interaction.user.id, econ);

      await interaction.reply(`💼 You worked as a **${job}** and earned **${earnings} coins**! New balance: ${econ.balance}.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('pay')
      .setDescription('Send coins to another user')
      .addUserOption(o => o.setName('user').setDescription('Who to pay').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount to send').setRequired(true)),
    async execute(interaction) {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');

      if (target.id === interaction.user.id) {
        return interaction.reply({ content: "You can't pay yourself!", ephemeral: true });
      }
      if (amount <= 0) {
        return interaction.reply({ content: 'Amount must be positive.', ephemeral: true });
      }

      const sender = store.getEconomy(interaction.user.id);
      if (sender.balance < amount) {
        return interaction.reply({ content: "You don't have enough coins.", ephemeral: true });
      }

      const receiver = store.getEconomy(target.id);
      sender.balance -= amount;
      receiver.balance += amount;
      store.setEconomy(interaction.user.id, sender);
      store.setEconomy(target.id, receiver);

      await interaction.reply(`✅ You sent **${amount} coins** to **${target.username}**.`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('bank')
      .setDescription('Deposit or withdraw coins from your bank')
      .addStringOption(o =>
        o.setName('action').setDescription('Deposit or withdraw').setRequired(true)
          .addChoices({ name: 'Deposit', value: 'deposit' }, { name: 'Withdraw', value: 'withdraw' })
      )
      .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)),
    async execute(interaction) {
      const action = interaction.options.getString('action');
      const amount = interaction.options.getInteger('amount');
      const econ = store.getEconomy(interaction.user.id);

      if (amount <= 0) return interaction.reply({ content: 'Amount must be positive.', ephemeral: true });

      if (action === 'deposit') {
        if (econ.balance < amount) return interaction.reply({ content: "You don't have that much in your wallet.", ephemeral: true });
        econ.balance -= amount;
        econ.bank += amount;
      } else {
        if (econ.bank < amount) return interaction.reply({ content: "You don't have that much in your bank.", ephemeral: true });
        econ.bank -= amount;
        econ.balance += amount;
      }

      store.setEconomy(interaction.user.id, econ);
      await interaction.reply(`✅ ${action === 'deposit' ? 'Deposited' : 'Withdrew'} **${amount} coins**. Wallet: ${econ.balance} | Bank: ${econ.bank}`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('richest')
      .setDescription("View the server's richest leaderboard"),
    async execute(interaction) {
      const all = store.getAllEconomy();
      const sorted = Object.entries(all)
        .map(([id, data]) => ({ id, total: data.balance + data.bank }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      if (sorted.length === 0) {
        return interaction.reply('No economy data yet — get started with `/daily` or `/work`!');
      }

      const lines = await Promise.all(
        sorted.map(async (entry, i) => {
          const user = await interaction.client.users.fetch(entry.id).catch(() => null);
          const name = user ? user.username : 'Unknown User';
          return `**${i + 1}.** ${name} — ${entry.total} coins`;
        })
      );

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('🏆 Richest Members')
        .setDescription(lines.join('\n'));
      await interaction.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('gamble')
      .setDescription('Gamble your coins for a chance to double them')
      .addIntegerOption(o => o.setName('amount').setDescription('Amount to gamble').setRequired(true)),
    async execute(interaction) {
      const amount = interaction.options.getInteger('amount');
      const econ = store.getEconomy(interaction.user.id);

      if (amount <= 0) return interaction.reply({ content: 'Amount must be positive.', ephemeral: true });
      if (econ.balance < amount) return interaction.reply({ content: "You don't have that many coins.", ephemeral: true });

      const won = Math.random() < 0.45;
      if (won) {
        econ.balance += amount;
        store.setEconomy(interaction.user.id, econ);
        await interaction.reply(`🎰 You won! You now have **${amount} extra coins**. Balance: ${econ.balance}.`);
      } else {
        econ.balance -= amount;
        store.setEconomy(interaction.user.id, econ);
        await interaction.reply(`💸 You lost **${amount} coins**. Balance: ${econ.balance}.`);
      }
    },
  },
];
