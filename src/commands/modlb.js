const {
 SlashCommandBuilder,
 EmbedBuilder
} = require("discord.js");

const store = require("../data/store");

module.exports = {

data: new SlashCommandBuilder()
.setName("modlb")
.setDescription("View mod leaderboard"),


async execute(interaction){

const leaderboard = store.getModLeaderboard();

let text = "";

leaderboard.forEach((user,index)=>{
 text += `**#${index+1}** <@${user[0]}> — **${user[1]} pts**\n\n`;
});


const embed = new EmbedBuilder()
.setTitle("🛡️ Mod Leaderboard")
.setDescription(text || "No mod points yet")
.setColor("Blue");


interaction.reply({
embeds:[embed]
});

}

};
