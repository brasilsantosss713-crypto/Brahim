const { 
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("activitycheck")
        .setDescription("Check who is active in the server"),

    async execute(interaction) {

        const emoji = "<:Goat:1495972536595386470>";

        const message = await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🐐 Activity Check")
                    .setDescription(
                        `React with ${emoji} if you are active!\n\nYou have 5 minutes.`
                    )
                    .setColor("Orange")
            ],
            fetchReply: true
        });


        await message.react(emoji);


        setTimeout(async () => {

            const fetched = await interaction.channel.messages.fetch(message.id);

            const reaction = fetched.reactions.cache.get(emoji);

            let reactedUsers = [];

            if (reaction) {
                const users = await reaction.users.fetch();

                reactedUsers = users
                    .filter(user => !user.bot)
                    .map(user => user.id);
            }


            const members = await interaction.guild.members.fetch();

            const active = [];
            const inactive = [];


            members.forEach(member => {

                if (member.user.bot) return;

                if (reactedUsers.includes(member.id)) {
                    active.push(`<@${member.id}>`);
                } else {
                    inactive.push(`<@${member.id}>`);
                }

            });


            const embed = new EmbedBuilder()
                .setTitle("🐐 Activity Check Results")
                .setColor("Green")
                .addFields(
                    {
                        name: "✅ Reacted",
                        value: active.length 
                            ? active.join("\n")
                            : "Nobody reacted"
                    },
                    {
                        name: "❌ Didn't React",
                        value: inactive.length
                            ? inactive.join("\n")
                            : "Everyone reacted"
                    }
                )
                .setTimestamp();


            await interaction.channel.send({
                embeds: [embed]
            });


        }, 86400000); // 24 Hours

    }
};
