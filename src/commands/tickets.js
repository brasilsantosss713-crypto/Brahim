const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require("discord.js");


module.exports = {

data: new SlashCommandBuilder()
.setName("ticketpanel")
.setDescription("Create a ticket panel")
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

.addChannelOption(option =>
 option
 .setName("channel")
 .setDescription("Ticket panel channel")
 .setRequired(true)
),


async execute(interaction) {

const channel = interaction.options.getChannel("channel");


const embed = new EmbedBuilder()
.setTitle("Tickets")
.setDescription("Open a ticket below")
.setColor("Red");


const menu = new StringSelectMenuBuilder()
.setCustomId("ticket_select")
.setPlaceholder("Choose a ticket type")
.addOptions([

{
label:"Giveaway Claim",
description:"Claim a Giveaway always provide proof.",
value:"giveaway"
},

{
label:"Partnership",
description:"Partnering",
value:"partner"
},

{
label:"Market",
description:"Buy or sell skellies.",
value:"market"
},

{
label:"Giveaway Sponsors",
description:"Sponsor a giveaway",
value:"sponsor"
},

{
label:"Build Requests",
description:"Request a build make sure to send a schematic.",
value:"build"
},

{
label:"General Support",
description:"Open a ticket for support or questions.",
value:"support"
}

]);


const row = new ActionRowBuilder()
.addComponents(menu);


await channel.send({
embeds:[embed],
components:[row]
});


await interaction.reply({
content:"✅ Ticket panel created!",
ephemeral:true
});

}

};
