const {
 SlashCommandBuilder,
 EmbedBuilder
} = require("discord.js");

const store = require("../data/store");

module.exports = {

data: new SlashCommandBuilder()
.setName("partnerlb")
.setDescription("View partner leaderboard"),


async execute(interaction){

const leaderboard = store.getPartnerLeaderboard();

let text = "";

leaderboard.forEach((user,index)=>{
 text += `**#${index+1}** <@${user[0]}> — **${user[1]} pts**\n\n`;
});


const embed = new EmbedBuilder()
.setTitle("🤝 Partner Points Leaderboard")
.setDescription(text || "No partner points yet")
.setColor("Purple");


interaction.reply({
embeds:[embed]
});

}

};
