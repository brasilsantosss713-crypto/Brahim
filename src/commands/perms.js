const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("perms")
        .setDescription("Setup all server permissions")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        const guild = interaction.guild;

        await interaction.deferReply({ ephemeral: true });


        // Roles
        const roles = {
            Admin: "Administrator",
            Mod: "Moderator",
            Staff: "Staff",
            Partner: "Partner",
            Booster: "Booster"
        };


        let createdRoles = {};


        for (const roleName of Object.keys(roles)) {

            let role = guild.roles.cache.find(
                r => r.name === roleName
            );

            if (!role) {
                role = await guild.roles.create({
                    name: roleName,
                    reason: "Permissions setup"
                });
            }

            createdRoles[roleName] = role;
        }



        // Everyone permissions

        for (const channel of guild.channels.cache.values()) {

            await channel.permissionOverwrites.edit(
                guild.roles.everyone,
                {
                    SendMessages: true,
                    ViewChannel: true
                }
            );
        }



        // Staff channels

        const staffChannels = [
            "staff-chat",
            "mod-chat",
            "staff-logs",
            "ticket-logs"
        ];


        for (const name of staffChannels) {

            let channel = guild.channels.cache.find(
                c => c.name === name
            );


            if (!channel) {

                channel = await guild.channels.create({
                    name,
                    type: ChannelType.GuildText
                });

            }


            await channel.permissionOverwrites.edit(
                guild.roles.everyone,
                {
                    ViewChannel: false
                }
            );


            await channel.permissionOverwrites.edit(
                createdRoles.Staff,
                {
                    ViewChannel: true,
                    SendMessages: true
                }
            );


            await channel.permissionOverwrites.edit(
                createdRoles.Mod,
                {
                    ViewChannel: true,
                    SendMessages: true
                }
            );

        }



        // Ticket category

        let ticketCategory = guild.channels.cache.find(
            c => c.name === "Tickets" &&
            c.type === ChannelType.GuildCategory
        );


        if (!ticketCategory) {

            ticketCategory = await guild.channels.create({
                name: "Tickets",
                type: ChannelType.GuildCategory
            });

        }


        await ticketCategory.permissionOverwrites.edit(
            guild.roles.everyone,
            {
                ViewChannel: false
            }
        );


        await ticketCategory.permissionOverwrites.edit(
            createdRoles.Staff,
            {
                ViewChannel: true
            }
        );

        await ticketCategory.permissionOverwrites.edit(
            createdRoles.Mod,
            {
                ViewChannel: true
            }
        );



        await interaction.editReply(
            "✅ Permissions setup complete!\n\nRoles created:\n- Admin\n- Mod\n- Staff\n- Partner\n- Booster\n\nStaff channels and ticket permissions configured."
        );
    }
};
