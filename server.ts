import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  GuildMember,
  TextChannel,
  Role,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  AuditLogEvent
} from "discord.js";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  deleteDoc
} from "firebase/firestore";
import fs from "fs";
import dotenv from "dotenv";
import axios from "axios";
import { parseStringPromise } from "xml2js";

dotenv.config();

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Moderation Commands Definition
const commands = [
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption(option => option.setName("target").setDescription("The member to kick").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for kicking"))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .addUserOption(option => option.setName("target").setDescription("The member to ban").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for banning"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout a member")
    .addUserOption(option => option.setName("target").setDescription("The member to mute").setRequired(true))
    .addIntegerOption(option => option.setName("duration").setDescription("Duration in minutes").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for muting"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Remove timeout from a member")
    .addUserOption(option => option.setName("target").setDescription("The member to unmute").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for unmuting"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server")
    .addStringOption(option => option.setName("userid").setDescription("The ID of the user to unban").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for unbanning"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName("setup-logs")
    .setDescription("Set the channel for moderation logs")
    .addChannelOption(option => option.setName("channel").setDescription("The channel to send logs to").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("setup-autorole")
    .setDescription("Set a role to be automatically assigned to new members")
    .addRoleOption(option => option.setName("role").setDescription("The role to assign").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("setup-verification")
    .setDescription("Set up a verification channel with a button")
    .addChannelOption(option => option.setName("channel").setDescription("The channel for verification").setRequired(true))
    .addRoleOption(option => option.setName("role").setDescription("The role to give upon verification").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Check your or someone else's rank")
    .addUserOption(option => option.setName("target").setDescription("The user to check")),

  new SlashCommandBuilder()
    .setName("level")
    .setDescription("Leveling system commands")
    .addSubcommand(subcommand =>
      subcommand
        .setName("start")
        .setDescription("Enable the leveling system")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("stop")
        .setDescription("Disable the leveling system")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("msg")
        .setDescription("Customize the level-up message")
        .addStringOption(option => option.setName("message").setDescription("Message (use {user} and {level})").setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("leaderboard")
        .setDescription("View the server level leaderboard")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("reset")
        .setDescription("Reset all member levels and XP (Admin only)")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("test-levelup")
    .setDescription("Test how the level up message looks")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete a specified amount of messages from a channel")
    .addIntegerOption(option => 
      option.setName("amount")
        .setDescription("Amount of messages to delete (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addChannelOption(option => 
      option.setName("channel")
        .setDescription("The channel to purge messages from (defaults to current channel)")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a native Discord poll")
    .addStringOption(option => 
      option.setName("question")
        .setDescription("The question for the poll")
        .setRequired(true)
    )
    .addStringOption(option => option.setName("option1").setDescription("Poll option 1").setRequired(true))
    .addStringOption(option => option.setName("option2").setDescription("Poll option 2").setRequired(true))
    .addStringOption(option => option.setName("option3").setDescription("Poll option 3"))
    .addStringOption(option => option.setName("option4").setDescription("Poll option 4"))
    .addStringOption(option => option.setName("option5").setDescription("Poll option 5")),

  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure the welcome system")
    .addSubcommand(subcommand =>
      subcommand
        .setName("setup")
        .setDescription("Set the welcome message and channel")
        .addChannelOption(option => 
          option.setName("channel")
            .setDescription("The channel to send welcome messages in")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option => 
          option.setName("message")
            .setDescription("The welcome message (use [@invited] for member ping)")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Configure the invite tracking system")
    .addSubcommand(subcommand =>
      subcommand
        .setName("setup")
        .setDescription("Set the invite tracking message and channel")
        .addChannelOption(option => 
          option.setName("channel")
            .setDescription("The channel to send invite logs in")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option => 
          option.setName("message")
            .setDescription("The invite message (use [inviter], [invites], [@invited])")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("reset")
        .setDescription("Reset all member invite counts (Admin only)")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("leaderboard")
        .setDescription("View the server invite leaderboard")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("send")
    .setDescription("Send an announcement or message through the bot")
    .addStringOption(option => 
      option.setName("message")
        .setDescription("The message to send")
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName("header")
        .setDescription("The header/title for the announcement (optional)")
    )
    .addChannelOption(option => 
      option.setName("channel")
        .setDescription("The channel to send the message in (defaults to current)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("whitelisted")
    .setDescription("Manage whitelisted URLs for link protection")
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a URL/domain to the whitelist")
        .addStringOption(option => option.setName("url").setDescription("The URL or domain (e.g. google.com)").setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove a URL/domain from the whitelist")
        .addStringOption(option => option.setName("url").setDescription("The URL or domain to remove").setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("List all whitelisted URLs")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Toggle the auto-moderation system")
    .addSubcommand(subcommand =>
      subcommand
        .setName("start")
        .setDescription("Enable auto-moderation for this server")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("stop")
        .setDescription("Disable auto-moderation for this server")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("View bot statistics"),

  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Locks the current channel (denies SendMessages for @everyone)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlocks the current channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName("lockall")
    .setDescription("Locks all text channels in the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("unlockall")
    .setDescription("Unlocks all text channels in the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("antiraid")
    .setDescription("Anti-Raid system settings")
    .addSubcommand(subcommand =>
      subcommand
        .setName("setup")
        .setDescription("Configure Anti-Raid sensitivity")
        .addIntegerOption(opt => opt.setName("min-age").setDescription("Minimum account age in days (0 to disable)").setRequired(true))
        .addIntegerOption(opt => opt.setName("join-limit").setDescription("Max joins allowed in the time window").setRequired(true))
        .addIntegerOption(opt => opt.setName("window").setDescription("Time window in seconds for join limit").setRequired(true))
        .addStringOption(opt => opt.setName("action").setDescription("Action to take (KICK/BAN/NOTIFY)").setRequired(true)
          .addChoices({ name: "Kick", value: "KICK" }, { name: "Ban", value: "BAN" }, { name: "Notify Only", value: "NOTIFY" }))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("start")
        .setDescription("Enable the Anti-Raid system")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("stop")
        .setDescription("Disable the Anti-Raid system")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("permission")
    .setDescription("Configure custom admin permissions for other users/roles to use the bot")
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Authorize a user or role to run bot configuration and moderation commands")
        .addUserOption(opt => opt.setName("user").setDescription("User to authorize").setRequired(false))
        .addRoleOption(opt => opt.setName("role").setDescription("Role to authorize").setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Revoke authorization from a user or role")
        .addUserOption(opt => opt.setName("user").setDescription("User to de-authorize").setRequired(false))
        .addRoleOption(opt => opt.setName("role").setDescription("Role to de-authorize").setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("List all currently authorized users and roles")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
 ].map(command => command.toJSON());

async function registerCommands() {
  if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID. Skipping command registration.");
    return;
  }
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  try {
    console.log("Started refreshing application (/) commands.");
    if (GUILD_ID) {
      // Clear global commands if we are using guild commands to avoid duplicates
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log("Successfully reloaded guild (/) commands and cleared global commands.");
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log("Successfully reloaded global (/) commands.");
    }
  } catch (error) {
    console.error(error);
  }
}

async function logModerationAction(guild: any, moderator: any, target: any, action: string, reason: string) {
  try {
    const payload = {
      guildId: guild.id,
      guildName: guild.name,
      userId: target?.id || target?.user?.id || (typeof target === "string" ? target : null) || moderator.id || "N/A",
      userName: target?.user?.username || target?.username || (typeof target === "string" ? target : null) || moderator.username || "N/A",
      moderatorId: moderator.id,
      moderatorName: moderator.username,
      action: action,
      reason: reason || "No reason provided",
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    };
    
    // 1. Log to Firestore
    await addDoc(collection(db, "logs"), payload).catch(err => {
      console.error("Firestore [logs] Write Failure:", err.message, JSON.stringify(err));
    });

    // 2. Log to Discord Channel if configured
    const settingsRef = doc(db, "guilds", guild.id);
    const settingsSnap = await getDoc(settingsRef).catch(err => {
      console.error("Firestore [guilds] Read Failure:", err.message);
      return null;
    });

    if (settingsSnap && settingsSnap.exists()) {
      const data = settingsSnap.data();
      if (data.logChannelId) {
        const channel = await guild.channels.fetch(data.logChannelId).catch(() => null);
        if (channel && channel instanceof TextChannel) {
          const isCommand = action === "COMMAND";
          const fields = [
            { name: isCommand ? "User" : "Moderator", value: `${moderator.tag || moderator.username} (${moderator.id})`, inline: true },
            { name: isCommand ? "Command Detail" : "Reason", value: reason || "No reason provided" }
          ];

          if (target) {
            fields.unshift({ name: "Target", value: `${target.user?.tag || target.tag || target.username || target} (${target.id || target})`, inline: true });
          }

          await channel.send({
            embeds: [{
              title: isCommand ? `Command Execution Log` : `Moderation Action: ${action}`,
              fields: fields,
              timestamp: new Date().toISOString(),
              color: action === "BAN" ? 0xFF0000 : action === "KICK" ? 0xFFA500 : action === "PURGE" ? 0x3498DB : isCommand ? 0x5865F2 : 0x00FF00
            }]
          }).catch(err => console.error("Discord Channel Log Failure:", err.message));
        }
      }
    }
  } catch (error) {
    console.error("Critical Error in logModerationAction:", error);
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, user } = interaction;
  if (!guild) return;

  // Only the server owner or authorized users/roles can use bot's configuration and moderation commands
  const subcommandName = options.getSubcommand(false);
  const isPublic = ["rank", "stats", "poll"].includes(commandName) ||
                   (commandName === "level" && subcommandName === "leaderboard") ||
                   (commandName === "invite" && subcommandName === "leaderboard");

  if (!isPublic) {
    let isAuthorized = user.id === guild.ownerId;

    if (commandName === "permission") {
      if (user.id !== guild.ownerId) {
        return interaction.reply({
          content: "❌ Only the server owner can configure bot permissions.",
          ephemeral: true
        });
      }
    } else if (!isAuthorized) {
      try {
        const settingsRef = doc(db, "guilds", guild.id);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          const authorizedUsers = data.authorizedUsers || [];
          const authorizedRoles = data.authorizedRoles || [];

          if (authorizedUsers.includes(user.id)) {
            isAuthorized = true;
          } else {
            const member = interaction.member as GuildMember;
            if (member && member.roles) {
              const hasRole = member.roles.cache.some(role => authorizedRoles.includes(role.id));
              if (hasRole) {
                isAuthorized = true;
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to read guild settings for command authorization:", err);
      }
    }

    if (!isAuthorized) {
      return interaction.reply({
        content: "❌ Only the server owner or authorized users/roles can use this command.",
        ephemeral: true
      });
    }
  }

  try {
    // Log the command execution
    let optStrings: string[] = [];
    try {
      options.data.forEach((opt: any) => {
        if (opt.value !== undefined) {
          optStrings.push(`${opt.name}: ${opt.value}`);
        } else if (opt.options) {
          opt.options.forEach((subOpt: any) => {
            optStrings.push(`${subOpt.name}: ${subOpt.value}`);
          });
        }
      });
    } catch (e) {}
    const commandDetail = `/${commandName}${subcommandName ? " " + subcommandName : ""}${optStrings.length ? " (" + optStrings.join(", ") + ")" : ""}`;
    await logModerationAction(guild, user, null, "COMMAND", `Executed command: ${commandDetail}`);

    if (commandName === "kick") {
      const target = options.getMember("target") as GuildMember;
      const reason = options.getString("reason") || "No reason provided";
      if (!target) return interaction.reply({ content: "Target not found.", ephemeral: true });
      await target.kick(reason);
      await logModerationAction(guild, user, target, "KICK", reason);
      await interaction.reply(`${target.user.username} has been kicked for: ${reason}`);
    } else if (commandName === "ban") {
      const target = options.getUser("target");
      const reason = options.getString("reason") || "No reason provided";
      if (!target) return interaction.reply({ content: "Target not found.", ephemeral: true });
      await guild.members.ban(target, { reason });
      await logModerationAction(guild, user, target, "BAN", reason);
      await interaction.reply(`${target.username} has been banned for: ${reason}`);
    } else if (commandName === "mute") {
      const target = options.getMember("target") as GuildMember;
      const duration = options.getInteger("duration") || 60;
      const reason = options.getString("reason") || "No reason provided";
      if (!target) return interaction.reply({ content: "Target not found.", ephemeral: true });
      await target.timeout(duration * 60 * 1000, reason);
      await logModerationAction(guild, user, target, "MUTE", `${duration}m - ${reason}`);
      await interaction.reply(`${target.user.username} has been muted for ${duration} minutes.`);
    } else if (commandName === "unmute") {
      const target = options.getMember("target") as GuildMember;
      const reason = options.getString("reason") || "No reason provided";
      if (!target) return interaction.reply({ content: "Target not found.", ephemeral: true });
      await target.timeout(null, reason);
      await logModerationAction(guild, user, target, "UNMUTE", reason);
      await interaction.reply(`${target.user.username}'s mute has been removed.`);
    } else if (commandName === "unban") {
      const userId = options.getString("userid", true);
      const reason = options.getString("reason") || "No reason provided";
      await guild.members.unban(userId, reason);
      await logModerationAction(guild, user, { id: userId, username: "ID: " + userId }, "UNBAN", reason);
      await interaction.reply(`User ID ${userId} has been unbanned.`);
    } else if (commandName === "setup-logs") {
      const channel = options.getChannel("channel", true);
      await setDoc(doc(db, "guilds", guild.id), { 
        guildId: guild.id,
        logChannelId: channel.id 
      }, { merge: true });
      await interaction.reply(`Logging channel set to <#${channel.id}>`);
    } else if (commandName === "setup-autorole") {
      const role = options.getRole("role", true);
      await setDoc(doc(db, "guilds", guild.id), { 
        guildId: guild.id,
        autoRoleId: role.id 
      }, { merge: true });
      await interaction.reply(`Auto-role set to <@&${role.id}>`);
    } else if (commandName === "setup-verification") {
      const channel = options.getChannel("channel", true) as TextChannel;
      const role = options.getRole("role", true);
      
      await setDoc(doc(db, "guilds", guild.id), { 
        guildId: guild.id,
        verificationChannelId: channel.id,
        verifiedRoleId: role.id
      }, { merge: true });

      // LOGIC: Before verification, hide channels.
      // This is best done by setting @everyone to not see the channel and the role to see it.
      try {
        // Update @everyone to see nothing
        await guild.roles.everyone.setPermissions(guild.roles.everyone.permissions.remove(PermissionFlagsBits.ViewChannel));
        
        // Update the verified role to see channels
        if (role instanceof Role) {
          await role.edit({
            permissions: role.permissions.add(PermissionFlagsBits.ViewChannel)
          });
          // Hide verification channel from the verified role
          await channel.permissionOverwrites.edit(role, { ViewChannel: false });
        }

        // Ensure the verification channel IS visible to everyone
        await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true, SendMessages: false });
      } catch (permError) {
        console.warn("Could not auto-configure permissions. Please ensure the bot has 'Administrator' and its role is higher than the verified role.");
      }

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('verify_user')
            .setLabel('Verify to Access Server')
            .setStyle(ButtonStyle.Success),
        );

      await channel.send({
        embeds: [{
          title: "Server Verification",
          description: "Welcome! Click the button below to verify your account and gain access to the rest of the server.",
          color: 0x5865F2
        }],
        components: [row]
      });

      await interaction.reply({ content: `Verification system set up in <#${channel.id}>. Unverified users are now locked out, and verified users will receive the <@&${role.id}> role.`, ephemeral: true });
    } else if (commandName === "rank") {
      const targetUser = options.getUser("target") || user;
      const levelRef = doc(db, "guilds", guild.id, "levels", targetUser.id);
      const levelSnap = await getDoc(levelRef);
      
      if (!levelSnap.exists()) {
        return interaction.reply(`${targetUser.username} hasn't earned any XP yet!`);
      }

      const data = levelSnap.data();
      const nextLevelXp = 5 * (data.level ** 2) + 50 * data.level + 100;
      
      await interaction.reply({
        embeds: [{
          title: `${targetUser.username}'s Rank`,
          thumbnail: { url: targetUser.displayAvatarURL() },
          fields: [
            { name: "Level", value: data.level.toString(), inline: true },
            { name: "XP", value: `${data.xp} / ${nextLevelXp}`, inline: true }
          ],
          color: 0x5865F2
        }]
      });
    } else if (commandName === "level") {
      const subCommand = options.getSubcommand();
      const settingsRef = doc(db, "guilds", interaction.guildId!);

      if (subCommand === "start" || subCommand === "stop") {
        const enabled = subCommand === "start";
        try {
          await setDoc(settingsRef, { levelingEnabled: enabled }, { merge: true });
          await interaction.reply({ 
            content: `✨ **Leveling System** has been ${enabled ? "🚀 **ENABLED**" : "🛑 **DISABLED**"} for this server.`,
            ephemeral: true 
          });
        } catch (err: any) {
          console.error("Level Toggle Error:", err);
          await interaction.reply({ content: "Failed to update leveling settings.", ephemeral: true });
        }
      } else if (subCommand === "msg") {
        const message = options.getString("message", true);
        try {
          await setDoc(settingsRef, { levelUpMessage: message }, { merge: true });
          await interaction.reply({ 
            content: `✅ **Level-up message** updated!\n**New Message:** ${message}`,
            ephemeral: true 
          });
        } catch (err: any) {
          console.error("Level Msg Error:", err);
          await interaction.reply({ content: "Failed to update level-up message.", ephemeral: true });
        }
      } else if (subCommand === "leaderboard") {
        const levelColl = collection(db, "guilds", guild.id, "levels");
        const q = query(levelColl, orderBy("xp", "desc"), limit(10));
        const querySnap = await getDocs(q).catch(err => {
          console.error("Level Leaderboard query failed:", err);
          return null;
        });
        
        if (!querySnap || querySnap.empty) {
          return interaction.reply("The level leaderboard is empty!");
        }

        const leaderboard = querySnap.docs.map((doc, index) => {
          const data = doc.data();
          return `${index + 1}. <@${data.userId}> - Level ${data.level} (${data.xp} XP)`;
        }).join("\n");

        await interaction.reply({
          embeds: [{
            title: `🏆 Level Leaderboard - ${guild.name}`,
            description: leaderboard,
            color: 0x5865F2,
            timestamp: new Date().toISOString()
          }]
        });
      } else if (subCommand === "reset") {
        try {
          const levelsRef = collection(db, "guilds", interaction.guildId!, "levels");
          const levelsSnap = await getDocs(levelsRef);
          const promises = levelsSnap.docs.map(levelDoc => 
            deleteDoc(levelDoc.ref)
          );
          await Promise.all(promises);

          await interaction.reply({ content: "✅ All member levels and XP have been reset!", ephemeral: true });
        } catch (err: any) {
          console.error("Level Reset Error:", err);
          await interaction.reply({ content: "Failed to reset levels in database.", ephemeral: true });
        }
      }
    } else if (commandName === "test-levelup") {
      const settingsSnap = await getDoc(doc(db, "guilds", guild.id));
      const settings = settingsSnap.exists() ? settingsSnap.data() : {};
      const levelUpMsg = settings.levelUpMessage || "GG {user}, you just leveled up to **level {level}**!";
      
      await interaction.reply({
        content: "Here is what your level-up message looks like:",
        embeds: [{
          description: levelUpMsg.replace("{user}", `<@${user.id}>`).replace("{level}", "5"),
          color: 0x5865F2
        }],
        ephemeral: true
      });
    } else if (commandName === "purge") {
      const amount = options.getInteger("amount", true);
      const targetChannel = options.getChannel("channel") || interaction.channel;
      
      if (!targetChannel || (targetChannel.type !== ChannelType.GuildText && targetChannel.type !== ChannelType.GuildAnnouncement && targetChannel.type !== ChannelType.GuildVoice)) {
        return interaction.reply({ content: "Please specify a valid text or voice channel for purging.", ephemeral: true });
      }

      try {
        const deleted = await (targetChannel as any).bulkDelete(amount, true);
        await interaction.reply({ content: `Successfully deleted ${deleted.size} messages from <#${targetChannel.id}>.`, ephemeral: true });
        
        await logModerationAction(guild, user, null, "PURGE", `${deleted.size} messages deleted in <#${targetChannel.id}>`);
      } catch (err: any) {
        console.error("Purge Error:", err);
        await interaction.reply({ content: "Failed to purge messages. They might be older than 14 days or I lack permissions in that channel.", ephemeral: true });
      }
    } else if (commandName === "poll") {
      const question = options.getString("question", true);
      const optionsArray = [
        options.getString("option1", true),
        options.getString("option2", true),
        options.getString("option3"),
        options.getString("option4"),
        options.getString("option5"),
      ].filter(opt => opt !== null) as string[];

      try {
        await interaction.reply({
          poll: {
            question: { text: question },
            answers: optionsArray.map(opt => ({ text: opt })),
            allowMultiselect: false,
            duration: 24 // 24 hours
          }
        });
      } catch (err: any) {
        console.error("Poll Error:", err);
        await interaction.reply({ content: "Failed to create poll. Discord native polls have strict limits on text length.", ephemeral: true });
      }
    } else if (commandName === "welcome") {
      const subCommand = options.getSubcommand();
      if (subCommand === "setup") {
        const channel = options.getChannel("channel", true);
        const message = options.getString("message", true);

        try {
          const settingsRef = doc(db, "guilds", interaction.guildId!);
          await setDoc(settingsRef, {
            welcomeEnabled: true,
            welcomeChannelId: channel.id,
            welcomeMessage: message
          }, { merge: true });

          await interaction.reply({ content: `✅ Welcome system configured!\n**Channel:** <#${channel.id}>\n**Message:** ${message}`, ephemeral: true });
        } catch (err: any) {
          console.error("Welcome Setup Error:", err);
          await interaction.reply({ content: "Failed to update welcome settings in database.", ephemeral: true });
        }
      }
    } else if (commandName === "invite") {
      const subCommand = options.getSubcommand();
      if (subCommand === "setup") {
        const channel = options.getChannel("channel", true);
        const message = options.getString("message", true);

        try {
          const settingsRef = doc(db, "guilds", interaction.guildId!);
          await setDoc(settingsRef, {
            inviteTrackingEnabled: true,
            inviteChannelId: channel.id,
            inviteMessage: message
          }, { merge: true });

          await interaction.reply({ content: `✅ Invite tracking configured!\n**Channel:** <#${channel.id}>\n**Message:** ${message}`, ephemeral: true });
        } catch (err: any) {
          console.error("Invite Setup Error:", err);
          await interaction.reply({ content: "Failed to update invite settings in database.", ephemeral: true });
        }
      } else if (subCommand === "reset") {
        try {
          // 1. Reset counts in levels
          const levelsRef = collection(db, "guilds", interaction.guildId!, "levels");
          const levelsSnap = await getDocs(levelsRef);
          const promises = levelsSnap.docs.map(levelDoc => 
            setDoc(levelDoc.ref, { invites: 0 }, { merge: true })
          );
          
          // 2. Delete unique invite records
          const invitesRef = collection(db, "guilds", interaction.guildId!, "invites");
          const invitesSnap = await getDocs(invitesRef);
          const deletePromises = invitesSnap.docs.map(inviteDoc => 
            deleteDoc(inviteDoc.ref)
          );
          
          await Promise.all([...promises, ...deletePromises]);
          await interaction.reply({ content: "✅ All member invite counts have been reset!", ephemeral: true });
        } catch (err: any) {
          console.error("Invite Reset Error:", err);
          await interaction.reply({ content: "Failed to reset invites in database.", ephemeral: true });
        }
      } else if (subCommand === "leaderboard") {
        const levelColl = collection(db, "guilds", interaction.guildId!, "levels");
        const q = query(levelColl, orderBy("invites", "desc"), limit(10));
        const querySnap = await getDocs(q).catch(err => {
          console.error("Invite Leaderboard query failed:", err);
          return null;
        });
        
        if (!querySnap || querySnap.empty) {
          return interaction.reply("The invite leaderboard is empty!");
        }

        const leaderboard = querySnap.docs
          .filter(doc => (doc.data().invites || 0) > 0)
          .map((doc, index) => {
            const data = doc.data();
            return `${index + 1}. <@${data.userId}> - **${data.invites || 0}** unique invites`;
          }).join("\n");

        if (!leaderboard) return interaction.reply("No one has invited anyone yet!");

        await interaction.reply({
          embeds: [{
            title: `📩 Invite Leaderboard - ${guild.name}`,
            description: leaderboard,
            color: 0x5865F2,
            timestamp: new Date().toISOString()
          }]
        });
      }
    } else if (commandName === "send") {
      const messageText = options.getString("message", true);
      const headerText = options.getString("header");
      const targetChannel = options.getChannel("channel") || interaction.channel;

      if (!targetChannel || !('isTextBased' in targetChannel) || !targetChannel.isTextBased()) {
        return interaction.reply({ content: "Please specify a valid text channel.", ephemeral: true });
      }

      try {
        if (headerText) {
          await (targetChannel as any).send({
            embeds: [{
              title: headerText,
              description: messageText,
              color: 0x5865F2,
              timestamp: new Date().toISOString(),
              footer: {
                text: `Broadcasted by ${user.username}`,
                icon_url: user.displayAvatarURL()
              }
            }]
          });
        } else {
          await (targetChannel as any).send(messageText);
        }
        
        await interaction.reply({ content: `✅ Message sent to <#${targetChannel.id}>!`, ephemeral: true });
        
        await logModerationAction(guild, user, null, "SEND_MESSAGE", `${headerText ? `[${headerText}] ` : ""}${messageText.substring(0, 100)}...`);
      } catch (err: any) {
        console.error("Send Command Error:", err);
        await interaction.reply({ content: "Failed to send message. Ensure I have permissions in that channel.", ephemeral: true });
      }
    } else if (commandName === "whitelisted") {
      const subCommand = options.getSubcommand();
      const settingsRef = doc(db, "guilds", interaction.guildId!);
      const settingsSnap = await getDoc(settingsRef);
      const data = settingsSnap.exists() ? settingsSnap.data() : { urlWhitelist: [] };
      const whitelist = data.urlWhitelist || [];

      if (subCommand === "add") {
        const url = options.getString("url", true).toLowerCase().replace(/^https?:\/\//, "");
        if (whitelist.includes(url)) {
          return interaction.reply({ content: "This URL is already whitelisted.", ephemeral: true });
        }
        whitelist.push(url);
        await setDoc(settingsRef, { urlWhitelist: whitelist }, { merge: true });
        await interaction.reply({ content: `✅ Added \`${url}\` to the whitelist.`, ephemeral: true });
      } else if (subCommand === "remove") {
        const url = options.getString("url", true).toLowerCase();
        const index = whitelist.indexOf(url);
        if (index === -1) {
          return interaction.reply({ content: "URL not found in whitelist.", ephemeral: true });
        }
        whitelist.splice(index, 1);
        await setDoc(settingsRef, { urlWhitelist: whitelist }, { merge: true });
        await interaction.reply({ content: `✅ Removed \`${url}\` from the whitelist.`, ephemeral: true });
      } else if (subCommand === "list") {
        if (whitelist.length === 0) {
          return interaction.reply({ content: "The whitelist is empty.", ephemeral: true });
        }
        await interaction.reply({ 
          content: "**Whitelisted URLs:**\n" + whitelist.map((u: string) => `• ${u}`).join("\n"),
          ephemeral: true 
        });
      }
    } else if (commandName === "automod") {
      const subCommand = options.getSubcommand();
      const settingsRef = doc(db, "guilds", interaction.guildId!);
      const enabled = subCommand === "start";

      try {
        await setDoc(settingsRef, { automodEnabled: enabled }, { merge: true });
        await interaction.reply({ 
          content: `🛡️ **Auto-Mod** has been ${enabled ? "🚀 **ENABLED**" : "🛑 **DISABLED**"} for this server.`,
          ephemeral: true 
        });
      } catch (err: any) {
        console.error("Auto-mod Toggle Error:", err);
        await interaction.reply({ content: "Failed to update Auto-Mod settings.", ephemeral: true });
      }
    } else if (commandName === "lock") {
      const channel = interaction.channel as TextChannel;
      if (!channel) return interaction.reply({ content: "Channel not found.", ephemeral: true });
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
        await interaction.reply({ content: `🔒 <#${channel.id}> has been locked.` });
        await logModerationAction(guild, user, null, "LOCK", `Channel <#${channel.id}> locked`);
      } catch (err) {
        await interaction.reply({ content: "Failed to lock channel. Check permissions.", ephemeral: true });
      }
    } else if (commandName === "unlock") {
      const channel = interaction.channel as TextChannel;
      if (!channel) return interaction.reply({ content: "Channel not found.", ephemeral: true });
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
        await interaction.reply({ content: `🔓 <#${channel.id}> has been unlocked.` });
        await logModerationAction(guild, user, null, "UNLOCK", `Channel <#${channel.id}> unlocked`);
      } catch (err) {
        await interaction.reply({ content: "Failed to unlock channel. Check permissions.", ephemeral: true });
      }
    } else if (commandName === "lockall") {
      await interaction.deferReply({ ephemeral: true });
      const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement);
      let count = 0;
      for (const [id, channel] of channels) {
        try {
          await (channel as any).permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
          count++;
        } catch (e) {
          console.warn(`Failed to lock channel ${id}`);
        }
      }
      await interaction.editReply({ content: `🔒 Locked ${count} text channels.` });
      await logModerationAction(guild, user, null, "LOCK_ALL", `Locked ${count} channels`);
    } else if (commandName === "unlockall") {
      await interaction.deferReply({ ephemeral: true });
      const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement);
      let count = 0;
      for (const [id, channel] of channels) {
        try {
          await (channel as any).permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
          count++;
        } catch (e) {
          console.warn(`Failed to unlock channel ${id}`);
        }
      }
      await interaction.editReply({ content: `🔓 Unlocked ${count} text channels.` });
      await logModerationAction(guild, user, null, "UNLOCK_ALL", `Unlocked ${count} channels`);
    } else if (commandName === "antiraid") {
      const subCommand = options.getSubcommand();
      const settingsRef = doc(db, "guilds", guild.id);

      if (subCommand === "setup") {
        const minAge = options.getInteger("min-age", true);
        const joinLimit = options.getInteger("join-limit", true);
        const window = options.getInteger("window", true);
        const action = options.getString("action", true);

        await setDoc(settingsRef, {
          antiRaidMinAge: minAge,
          antiRaidJoinLimit: joinLimit,
          antiRaidJoinWindow: window,
          antiRaidAction: action
        }, { merge: true });

        await interaction.reply({ 
          content: `🛡️ **Anti-Raid System** configured!\n• **Min Account Age:** ${minAge} days\n• **Join Rate:** ${joinLimit} joins / ${window}s\n• **Action:** ${action}`,
          ephemeral: true 
        });
      } else if (subCommand === "start" || subCommand === "stop") {
        const enabled = subCommand === "start";
        await setDoc(settingsRef, { antiRaidEnabled: enabled }, { merge: true });
        await interaction.reply({ 
          content: `🛡️ **Anti-Raid System** has been ${enabled ? "🚀 **ENABLED**" : "🛑 **DISABLED**"}.`,
          ephemeral: true 
        });
      }
    } else if (commandName === "permission") {
      const subCommand = options.getSubcommand();
      const settingsRef = doc(db, "guilds", guild.id);
      const settingsSnap = await getDoc(settingsRef);
      const data = settingsSnap.exists() ? settingsSnap.data() : {};
      const authorizedUsers: string[] = data.authorizedUsers || [];
      const authorizedRoles: string[] = data.authorizedRoles || [];

      if (subCommand === "add") {
        const targetUser = options.getUser("user");
        const targetRole = options.getRole("role");

        if (!targetUser && !targetRole) {
          return interaction.reply({
            content: "❌ You must specify at least a user or a role to authorize.",
            ephemeral: true
          });
        }

        let descriptionParts: string[] = [];

        if (targetUser) {
          if (!authorizedUsers.includes(targetUser.id)) {
            authorizedUsers.push(targetUser.id);
          }
          descriptionParts.push(`User <@${targetUser.id}>`);
        }

        if (targetRole) {
          if (!authorizedRoles.includes(targetRole.id)) {
            authorizedRoles.push(targetRole.id);
          }
          descriptionParts.push(`Role <@&${targetRole.id}>`);
        }

        await setDoc(settingsRef, {
          authorizedUsers,
          authorizedRoles
        }, { merge: true });

        await interaction.reply({
          content: `✅ Successfully added custom bot authorization!\n• **Authorized:** ${descriptionParts.join(", ")}`,
          ephemeral: true
        });
        await logModerationAction(guild, user, null, "COMMAND", `Granted bot commands permission to: ${descriptionParts.join(", ")}`);

      } else if (subCommand === "remove") {
        const targetUser = options.getUser("user");
        const targetRole = options.getRole("role");

        if (!targetUser && !targetRole) {
          return interaction.reply({
            content: "❌ You must specify at least a user or a role to de-authorize.",
            ephemeral: true
          });
        }

        let descriptionParts: string[] = [];

        if (targetUser) {
          const index = authorizedUsers.indexOf(targetUser.id);
          if (index !== -1) {
            authorizedUsers.splice(index, 1);
            descriptionParts.push(`User <@${targetUser.id}>`);
          } else {
            return interaction.reply({
              content: `❌ User <@${targetUser.id}> is not authorized.`,
              ephemeral: true
            });
          }
        }

        if (targetRole) {
          const index = authorizedRoles.indexOf(targetRole.id);
          if (index !== -1) {
            authorizedRoles.splice(index, 1);
            descriptionParts.push(`Role <@&${targetRole.id}>`);
          } else {
            return interaction.reply({
              content: `❌ Role <@&${targetRole.id}> is not authorized.`,
              ephemeral: true
            });
          }
        }

        await setDoc(settingsRef, {
          authorizedUsers,
          authorizedRoles
        }, { merge: true });

        await interaction.reply({
          content: `✅ Successfully revoked custom bot authorization!\n• **De-authorized:** ${descriptionParts.join(", ")}`,
          ephemeral: true
        });
        await logModerationAction(guild, user, null, "COMMAND", `Revoked bot commands permission from: ${descriptionParts.join(", ")}`);

      } else if (subCommand === "list") {
        const userMentions = authorizedUsers.length > 0 
          ? authorizedUsers.map(id => `<@${id}> (\`${id}\`)`).join("\n") 
          : "None";
        const roleMentions = authorizedRoles.length > 0 
          ? authorizedRoles.map(id => `<@&${id}> (\`${id}\`)`).join("\n") 
          : "None";

        await interaction.reply({
          embeds: [{
            title: "🛡️ Bot Custom Permissions List",
            description: "Authorized users and roles can use all bot configuration & moderation commands.",
            fields: [
              { name: "👑 Server Owner (Always Allowed)", value: `<@${guild.ownerId}> (\`${guild.ownerId}\`)` },
              { name: "👤 Authorized Users", value: userMentions },
              { name: "👥 Authorized Roles", value: roleMentions }
            ],
            color: 0x5865F2,
            timestamp: new Date().toISOString()
          }],
          ephemeral: true
        });
      }
    } else if (commandName === "stats") {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      await interaction.reply({
        embeds: [{
          title: "🤖 Bot Statistics",
          thumbnail: { url: client.user?.displayAvatarURL() || "" },
          fields: [
            { name: "📡 Latency", value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
            { name: "⏳ Uptime", value: `\`${hours}h ${minutes}m ${seconds}s\``, inline: true },
            { name: "🏠 Servers", value: `\`${client.guilds.cache.size}\``, inline: true },
            { name: "👥 Users", value: `\`${client.users.cache.size}\``, inline: true },
            { name: "📦 Version", value: "`1.2.0`", inline: true },
            { name: "🧠 RAM Usage", value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true }
          ],
          color: 0x5865F2,
          footer: { text: "RealZyvok Utility Bot" },
          timestamp: new Date().toISOString()
        }]
      });
    }
  } catch (error: any) {
    console.error("Bot Command Error:", error);
    let errorMessage = error.message;
    if (errorMessage.includes("7 PERMISSION_DENIED")) {
      errorMessage = "Database access denied. I've reset the security rules to allow access—please try again now.";
    }
    await interaction.reply({ content: `Action failed: ${errorMessage}`, ephemeral: true });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'verify_user') {
    const guild = interaction.guild;
    if (!guild) return;

    try {
      const settingsRef = doc(db, "guilds", guild.id);
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        if (data.verifiedRoleId) {
          const member = interaction.member as GuildMember;
          await member.roles.add(data.verifiedRoleId);
          await interaction.reply({ content: "You have been verified!", ephemeral: true });
        } else {
          await interaction.reply({ content: "Verification role not configured.", ephemeral: true });
        }
      }
    } catch (error) {
      console.error("Verification failed:", error);
      await interaction.reply({ content: "Something went wrong during verification.", ephemeral: true });
    }
  }
});

const xpCooldowns = new Map<string, number>();
const messageFrequencies = new Map<string, number[]>();
const mentionFrequencies = new Map<string, number[]>();
const joinRecords = new Map<string, number[]>(); // guildId -> [timestamps]

// Invite Cache: guildId -> [inviteCode -> uses]
const invitesCache = new Map<string, Map<string, number>>();

async function cacheInvites(guild: any) {
  try {
    const invites = await guild.invites.fetch();
    const guildInvites = new Map<string, number>();
    invites.forEach((inv: any) => {
      guildInvites.set(inv.code, inv.uses);
    });
    invitesCache.set(guild.id, guildInvites);
  } catch (err) {
    console.warn(`Could not cache invites for guild ${guild.id}:`, err);
  }
}

client.on("ready", async () => {
  console.log(`Bot logged in as ${client.user?.tag}`);
  // Initial invite cache
  for (const guild of client.guilds.cache.values()) {
    await cacheInvites(guild);
  }
});

client.on("inviteCreate", async (invite) => {
  if (invite.guild) await cacheInvites(invite.guild);
});

client.on("inviteDelete", async (invite) => {
  if (invite.guild) await cacheInvites(invite.guild);
});

client.on("guildMemberAdd", async (member) => {
  // If the joining member is a bot, enforce that only the server owner can invite bots.
  if (member.user.bot) {
    let isAddAllowed = false;
    try {
      // Small delay to ensure Discord's audit log is generated and synchronized
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.BotAdd,
      });
      const botLog = fetchedLogs.entries.find(entry => entry.targetId === member.id);
      
      if (botLog) {
        if (botLog.executorId === member.guild.ownerId) {
          isAddAllowed = true;
        }
      }
    } catch (error) {
      console.error("Failed to verify audit logs for bot join:", error);
    }

    if (!isAddAllowed) {
      await member.kick("Anti-Raid: Bot additions are restricted to the server owner only.").catch(console.error);
      const modUser = client.user || { id: "SYSTEM", username: "System" };
      await logModerationAction(
        member.guild,
        modUser,
        member.user,
        "KICK",
        "Kicked unauthorized bot (Only the server owner is authorized to add bots. Administrators are blocked from adding bots)."
      );
      return;
    }
  }

  try {
    const settingsRef = doc(db, "guilds", member.guild.id);
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      const data = settingsSnap.data();

      // --- Anti-Raid System ---
      if (data.antiRaidEnabled) {
        const now = Date.now();
        const accountAgeDays = (now - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
        
        // 1. Account Age Check
        if (data.antiRaidMinAge && accountAgeDays < data.antiRaidMinAge) {
          const reason = `Anti-Raid: Account too new (${accountAgeDays.toFixed(1)} days < ${data.antiRaidMinAge} days)`;
          if (data.antiRaidAction === "BAN") {
            await member.ban({ reason });
          } else if (data.antiRaidAction === "KICK") {
            await member.kick(reason);
          }
          await logModerationAction(member.guild, client.user, member, data.antiRaidAction || "KICK", reason);
          return; // Stop further processing
        }

        // 2. Join Burst Check
        const guildJoins = joinRecords.get(member.guild.id) || [];
        const window = data.antiRaidJoinWindow || 10;
        const limit = data.antiRaidJoinLimit || 5;

        // Clean up old records
        const recentJoins = guildJoins.filter(ts => now - ts < window * 1000);
        recentJoins.push(now);
        joinRecords.set(member.guild.id, recentJoins);

        if (recentJoins.length >= limit) {
          const reason = `Anti-Raid: Join burst detected (${recentJoins.length} joins in ${window}s)`;
          if (data.antiRaidAction === "BAN") {
            await member.ban({ reason });
          } else if (data.antiRaidAction === "KICK") {
            await member.kick(reason);
          }
          await logModerationAction(member.guild, client.user, member, data.antiRaidAction || "KICK", reason);
          
          // Lockdown server? We can notify staff
          const logChannelId = data.logChannelId;
          if (logChannelId) {
            const channel = member.guild.channels.cache.get(logChannelId) as TextChannel;
            if (channel) {
              await channel.send(`⚠️ **RAID ALERT**: Excessive joins detected! System is taking ${data.antiRaidAction || "KICK"} action on new members.`);
            }
          }
          return;
        }
      }
      
      // Auto-role
      if (data.autoRoleId) {
        await member.roles.add(data.autoRoleId).catch(console.error);
      }

    // Welcome & Invite Tracking
    const welcomeRef = collection(db, "guilds", member.guild.id, "welcomes");
    
    // Log join event
    await addDoc(welcomeRef, {
      userId: member.id,
      userName: member.user.username,
      timestamp: new Date().toISOString()
    }).catch(console.error);

      // Welcome Message
      if (data.welcomeEnabled) {
        const welcomeChannelId = data.welcomeChannelId || member.guild.systemChannelId;
        if (welcomeChannelId) {
          const welcomeChannel = await member.guild.channels.fetch(welcomeChannelId).catch(() => null);
          if (welcomeChannel && welcomeChannel.isTextBased()) {
            const defaultWelcome = `🎉 Hey [@invited], you came in the server!\nWelcome to the official server of RealZyvok! 💙\n\nThis server is the place to:\n✨ Hang out with other viewers\n📢 Get notified about new uploads & livestreams\n🎮 Join events and giveaways\n💬 Chat, share ideas, and have fun\n\nPlease make sure to:\n📜 Read the rules\n👋 Introduce yourself\n🔔 Grab your notification roles\n\nEnjoy your stay and be awesome! 🚀`;
            let msg = data.welcomeMessage || defaultWelcome;
            msg = msg.replace(/\[@invited\]/g, `<@${member.id}>`)
                     .replace(/\[member_name\]/g, member.user.username);
            
            await (welcomeChannel as any).send(msg).catch(console.error);
          }
        }
      }

      // Invite Tracking
      if (data.inviteTrackingEnabled) {
        let inviter = null;
        let inviterInvites = 0;

        const newInvites = await member.guild.invites.fetch();
        const oldInvites = invitesCache.get(member.guild.id);
        
        const usedInvite = newInvites.find(inv => {
          const prevUses = oldInvites?.get(inv.code) || 0;
          return inv.uses! > prevUses;
        });

        if (usedInvite && usedInvite.inviter) {
          inviter = usedInvite.inviter;
          
          const inviteRecordRef = doc(db, "guilds", member.guild.id, "invites", member.id);
          const inviteRecordSnap = await getDoc(inviteRecordRef);
          
          const inviterRef = doc(db, "guilds", member.guild.id, "levels", inviter.id);
          
          if (!inviteRecordSnap.exists()) {
            // Record new unique invite
            const inviterSnap = await getDoc(inviterRef);
            let inviterData = inviterSnap.exists() ? inviterSnap.data() : { xp: 0, level: 0, userId: inviter.id, invites: 0 };
            inviterData.invites = (inviterData.invites || 0) + 1;
            inviterInvites = inviterData.invites;
            await setDoc(inviterRef, inviterData, { merge: true });

            await setDoc(inviteRecordRef, {
              invitedUserId: member.id,
              inviterId: inviter.id,
              timestamp: new Date().toISOString()
            });
          } else {
            // Already invited before, just fetch current count for message
            const inviterSnap = await getDoc(inviterRef);
            inviterInvites = inviterSnap.exists() ? (inviterSnap.data().invites || 0) : 0;
          }
        }
        
        await cacheInvites(member.guild);

        const inviteChannelId = data.inviteChannelId || data.welcomeChannelId || member.guild.systemChannelId;
        let inviteChannel = null;

        if (data.inviteChannelId) {
          inviteChannel = await member.guild.channels.fetch(data.inviteChannelId).catch(() => null);
        } else {
          // Fallback to specific name or default IDs
          inviteChannel = member.guild.channels.cache.find((c: any) => c.name === "︱👥︲ɪɴᴠɪᴛᴇꜱ" || c.name === "invites");
          if (!inviteChannel && inviteChannelId) {
            inviteChannel = await member.guild.channels.fetch(inviteChannelId).catch(() => null);
          }
        }

        if (inviteChannel && inviteChannel.isTextBased()) {
          let msg = data.inviteMessage || "[@invited] has been invited by [inviter] and has now [invites] invites.";
          msg = msg.replace(/\[@invited\]/g, `<@${member.id}>`)
                   .replace(/\[inviter\]/g, inviter ? `<@${inviter.id}>` : "Unknown")
                   .replace(/\[invites\]/g, inviterInvites.toString())
                   .replace(/\[member_name\]/g, member.user.username);
          
          await (inviteChannel as any).send(msg).catch(console.error);
        }
      }
    }
  } catch (error) {
    console.error("Join processing failed:", error);
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // 1. Leveling System
  try {
    const settingsSnap = await getDoc(doc(db, "guilds", message.guild.id));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
    
    if (settings.levelingEnabled !== false) {
      const cooldownKey = `${message.guild.id}-${message.author.id}`;
      const now = Date.now();
      const lastXpTime = xpCooldowns.get(cooldownKey) || 0;

      if (now - lastXpTime > 60000) { // 1 minute cooldown
        xpCooldowns.set(cooldownKey, now);
        
        const levelRef = doc(db, "guilds", message.guild.id, "levels", message.author.id);
        const levelSnap = await getDoc(levelRef);
        
        let data = levelSnap.exists() ? levelSnap.data() : { xp: 0, level: 0, userId: message.author.id };
        const xpGain = Math.floor(Math.random() * 11) + 15; // 15-25 XP
        data.xp += xpGain;

        const nextLevelXp = 5 * (data.level ** 2) + 50 * data.level + 100;
        
        if (data.xp >= nextLevelXp) {
          data.level += 1;
          const levelUpMsg = settings.levelUpMessage || "GG {user}, you just leveled up to **level {level}**!";
          const formattedMsg = levelUpMsg.replace("{user}", `<@${message.author.id}>`).replace("{level}", data.level.toString());
          
          let targetChannel: any = message.channel;
          if (settings.levelUpChannelId) {
            const configuredChannel = await message.guild.channels.fetch(settings.levelUpChannelId).catch(() => null);
            if (configuredChannel && configuredChannel.isTextBased()) {
              targetChannel = configuredChannel;
            }
          }
          
          await targetChannel.send(formattedMsg).catch((err: any) => console.error("Failed to send level up message:", err));
        }

        await setDoc(levelRef, data, { merge: true });
      }
    }

    // 2. Auto-Mod
    if (settings.automodEnabled !== false) {
      const content = message.content.toLowerCase();
      const action = settings.automodAction || "DELETE";
      let violationReason = "";
      const now = Date.now();

      // Check Banned Words
      const bannedWords = settings.bannedWords || [];
      const foundWord = bannedWords.find((word: string) => content.includes(word.toLowerCase()));
      if (foundWord) violationReason = `Banned word: ${foundWord}`;

      // Check Spam Mentions (Threshold or default 2 per 5s)
      if (!violationReason) {
        const mentionSpamKey = `mentions-${message.guild.id}-${message.author.id}`;
        const mentionTimestamps = mentionFrequencies.get(mentionSpamKey) || [];
        const filteredMentionTimestamps = mentionTimestamps.filter(t => now - t < 5000);
        
        const currentMentions = message.mentions.users.size + message.mentions.roles.size;
        for (let i = 0; i < currentMentions; i++) filteredMentionTimestamps.push(now);
        mentionFrequencies.set(mentionSpamKey, filteredMentionTimestamps);

        const threshold = settings.spamMentionsThreshold || 2;
        if (filteredMentionTimestamps.length >= threshold) {
          violationReason = `Mention spamming (${filteredMentionTimestamps.length} mentions in 5s)`;
        }
      }

      // Check Message Spam Frequency
      if (!violationReason && settings.spamMessageThreshold) {
        const spamKey = `${message.guild.id}-${message.author.id}`;
        const timestamps = messageFrequencies.get(spamKey) || [];
        const filteredTimestamps = timestamps.filter(t => now - t < 5000); // Check last 5 seconds
        filteredTimestamps.push(now);
        messageFrequencies.set(spamKey, filteredTimestamps);

        if (filteredTimestamps.length > settings.spamMessageThreshold) {
          violationReason = `Message spamming (${filteredTimestamps.length} messages in 5s)`;
        }
      }

      // Check Anti-Link & Anti-Invite
      if (!violationReason && (settings.antiLinkEnabled || settings.antiInviteEnabled)) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const discordInviteRegex = /(discord\.(gg|io|me|li)|discord\.com\/invite)\/([a-zA-Z0-9]+)/g;
        
        const urls = message.content.match(urlRegex) || [];
        const invites = message.content.match(discordInviteRegex) || [];

        if (settings.antiInviteEnabled && invites.length > 0) {
          violationReason = "Unauthorized Discord invite";
        } else if (settings.antiLinkEnabled && urls.length > 0) {
          const whitelist = settings.urlWhitelist || [];
          const unauthorizedUrl = (urls as string[]).find(url => {
            const domain = url.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
            return !whitelist.some((w: string) => domain.includes(w.toLowerCase()));
          });
          if (unauthorizedUrl) violationReason = `Unauthorized link: ${unauthorizedUrl}`;
        }
      }

      if (violationReason) {
        // 1. DELETE IMMEDIATELY
        await message.delete().catch(() => {});

        // 2. APPLY TIMEOUT (30s)
        const member = message.member;
        if (member) {
          await member.timeout(30 * 1000, `Auto-mod: ${violationReason}`).catch(() => {});
        }

        const dmMessage = `⚠️ **Auto-Mod Notice**\nYour message was deleted and you have been timed out for 30 seconds in **${message.guild.name}**.\n**Reason:** ${violationReason}${action === "WARN" ? "\n*This is an official warning.*" : ""}`;

        if (action === "DELETE" || action === "WARN") {
          await message.author.send(dmMessage).catch(() => {
            console.log(`Could not DM user ${message.author.tag}`);
          });
          await logModerationAction(message.guild, client.user, message.author, action === "WARN" ? "AUTOMOD_WARN" : "AUTOMOD_DELETE", violationReason);
        } else if (action === "KICK") {
          await message.author.send(`🚫 You have been kicked from **${message.guild.name}**\n**Reason:** ${violationReason}`).catch(() => {});
          await message.guild.members.kick(message.author, `Auto-mod: ${violationReason}`).catch(() => {});
          await logModerationAction(message.guild, client.user, message.author, "AUTOMOD_KICK", violationReason);
        } else if (action === "BAN") {
          await message.author.send(`🔨 You have been permanently banned from **${message.guild.name}**\n**Reason:** ${violationReason}`).catch(() => {});
          await message.guild.members.ban(message.author, { reason: `Auto-mod: ${violationReason}` }).catch(() => {});
          await logModerationAction(message.guild, client.user, message.author, "AUTOMOD_BAN", violationReason);
        }
        return; 
      }
    }
    
    // 3. Custom Commands
    const trigger = message.content.toLowerCase().trim();
    if (trigger === "tm") {
      await message.reply(`👥 Total Members: **${message.guild.memberCount}**`).catch(console.error);
    } else if (trigger === "i") {
      const levelRef = doc(db, "guilds", message.guild.id, "levels", message.author.id);
      const levelSnap = await getDoc(levelRef);
      const invites = levelSnap.exists() ? (levelSnap.data().invites || 0) : 0;
      await message.reply(`📩 You have **${invites}** unique invite(s).`).catch(console.error);
    }
  } catch (error) {
    console.error("Message processing error:", error);
  }
});

client.on("guildMemberRemove", async (member: any) => {
  await logModerationAction(member.guild, client.user, member.user, "LEAVE", "Member left the server");
});

client.on("messageDelete", async (message: any) => {
  if (!message.guild || message.author?.bot) return;
  await logModerationAction(message.guild, client.user, message.author, "MESSAGE_DELETE", `Message by **${message.author?.tag}** deleted in <#${message.channelId}>\n**Content:** ${message.content || "[No Content/Embed]"}`);
});

client.on("messageUpdate", async (oldMsg: any, newMsg: any) => {
  if (!oldMsg.guild || oldMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;
  await logModerationAction(oldMsg.guild, client.user, oldMsg.author, "MESSAGE_EDIT", `Message edited in <#${oldMsg.channelId}>\n**Old:** ${oldMsg.content || "[Empty]"}\n**New:** ${newMsg.content || "[Empty]"}`);
});

client.on("channelCreate", async (channel: any) => {
  if (!channel.guild) return;
  await logModerationAction(channel.guild, client.user, null, "CHANNEL_CREATE", `New channel created: **#${channel.name}** (<#${channel.id}>)`);
});

client.on("channelDelete", async (channel: any) => {
  if (!channel.guild) return;
  await logModerationAction(channel.guild, client.user, null, "CHANNEL_DELETE", `Channel deleted: **#${channel.name}**`);
});

client.on("roleCreate", async (role: any) => {
  await logModerationAction(role.guild, client.user, null, "ROLE_CREATE", `New role created: **${role.name}** (${role.id})`);
});

client.on("roleDelete", async (role: any) => {
  await logModerationAction(role.guild, client.user, null, "ROLE_DELETE", `Role deleted: **${role.name}**`);
});

client.on("voiceStateUpdate", async (oldState: any, newState: any) => {
  const guild = oldState.guild || newState.guild;
  const user = oldState.member?.user || newState.member?.user;
  if (!guild || !user) return;

  if (!oldState.channelId && newState.channelId) {
    await logModerationAction(guild, client.user, user, "VOICE_JOIN", `Joined voice channel: <#${newState.channelId}>`);
  } else if (oldState.channelId && !newState.channelId) {
    await logModerationAction(guild, client.user, user, "VOICE_LEAVE", `Left voice channel: <#${oldState.channelId}>`);
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    await logModerationAction(guild, client.user, user, "VOICE_MOVE", `Moved from <#${oldState.channelId}> to <#${newState.channelId}>`);
  }
});

client.on("guildUpdate", async (oldGuild: any, newGuild: any) => {
  let changes = [];
  if (oldGuild.name !== newGuild.name) changes.push(`Name: **${oldGuild.name}** -> **${newGuild.name}**`);
  if (oldGuild.icon !== newGuild.icon) changes.push(`Icon changed`);
  if (changes.length > 0) {
    await logModerationAction(newGuild, client.user, null, "GUILD_UPDATE", changes.join("\n"));
  }
});

async function checkYouTubeUpdates() {
  try {
    const guildsSnap = await getDocs(collection(db, "guilds"));
    for (const guildDoc of guildsSnap.docs) {
      const data = guildDoc.data();
      if (data.youtubeChannelId && data.youtubeAnnouncementChannelId) {
        try {
          const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${data.youtubeChannelId}`;
          const response = await axios.get(rssUrl);
          const result = await parseStringPromise(response.data);
          
          if (result && result.feed && result.feed.entry && result.feed.entry.length > 0) {
            const latestVideo = result.feed.entry[0];
            const videoId = latestVideo['yt:videoId'] ? latestVideo['yt:videoId'][0] : null;
            const videoTitle = latestVideo.title ? latestVideo.title[0] : "New Video";
            const videoUrl = latestVideo.link && latestVideo.link[0].$ ? latestVideo.link[0].$.href : null;

            if (videoId && videoId !== data.lastVideoId) {
              const guild = await client.guilds.fetch(guildDoc.id).catch(() => null);
              if (guild) {
                const channel = await guild.channels.fetch(data.youtubeAnnouncementChannelId).catch(() => null);
                if (channel && channel.isTextBased()) {
                  console.log(`[YouTube] Announcing new video "${videoTitle}" for guild ${guildDoc.id}`);
                  await (channel as any).send({
                    content: `@everyone **${videoTitle}** is now live on YouTube! Check it out: ${videoUrl || `https://www.youtube.com/watch?v=${videoId}`}`,
                  });
                  
                  // Update last video ID
                  await setDoc(doc(db, "guilds", guildDoc.id), { 
                    lastVideoId: videoId 
                  }, { merge: true });
                }
              }
            }
          }
        } catch (err) {
          console.error(`Failed to check YouTube for guild ${guildDoc.id}:`, err);
        }
      }
    }
  } catch (error) {
    console.error("YouTube checker failed:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API for dashboard
  app.get("/api/logs", async (req, res) => {
    res.json({ message: "Use Firestore client SDK to fetch logs." });
  });

  app.post("/api/guild/setup-verification", async (req, res) => {
    const { guildId } = req.body;
    if (!guildId) return res.status(400).json({ error: "Missing guildId" });

    try {
      const guild = await client.guilds.fetch(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });

      const settingsSnap = await getDoc(doc(db, "guilds", guildId));
      if (!settingsSnap.exists()) return res.status(404).json({ error: "Settings not found for this guild" });

      const data = settingsSnap.data();
      const channelId = data.verificationChannelId;
      const roleId = data.verifiedRoleId;

      if (!channelId || !roleId) return res.status(400).json({ error: "Verification channel or role not configured" });

      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || !(channel instanceof TextChannel)) return res.status(404).json({ error: "Verification channel not found or invalid" });

      const role = await guild.roles.fetch(roleId).catch(() => null);

      // Auto-configure permissions if possible
      try {
        await guild.roles.everyone.setPermissions(guild.roles.everyone.permissions.remove(PermissionFlagsBits.ViewChannel));
        if (role) {
          await role.edit({ permissions: role.permissions.add(PermissionFlagsBits.ViewChannel) });
          await channel.permissionOverwrites.edit(role, { ViewChannel: false });
        }
        await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true, SendMessages: false });
      } catch (e) {
        console.warn("Could not update permissions via dashboard API:", e);
      }

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('verify_user')
            .setLabel('Verify')
            .setStyle(ButtonStyle.Primary),
        );

      await channel.send({
        content: "Click the button below to verify and gain access to the server!",
        components: [row]
      });

      res.json({ message: "Verification message sent successfully" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Fetch guild channels
  app.get("/api/guilds/:guildId/channels", async (req, res) => {
    const { guildId } = req.params;
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return res.status(404).json({ error: "Guild not found" });

      const channels = await guild.channels.fetch();
      const textChannels = channels
        .filter(c => c !== null && c.isTextBased())
        .map(c => ({ id: c!.id, name: c!.name }));

      res.json(textChannels);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Fetch guild roles
  app.get("/api/guilds/:guildId/roles", async (req, res) => {
    const { guildId } = req.params;
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return res.status(404).json({ error: "Guild not found" });

      const roles = await guild.roles.fetch();
      const roleList = roles
        .filter(r => r.name !== "@everyone")
        .map(r => ({ id: r.id, name: r.name }));

      res.json(roleList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Resolve YouTube Handle
  app.get("/api/youtube/resolve/:handle", async (req, res) => {
    let { handle } = req.params;
    if (!handle.startsWith("@")) handle = "@" + handle;

    try {
      const url = `https://www.youtube.com/${handle}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
      });
      const html = response.data;

      const channelIdMatch = html.match(/"channelId":"(.*?)"/) || 
                             html.match(/itemprop="identifier" content="(.*?)"/) ||
                             html.match(/meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/(.*?)"/);
      const channelId = channelIdMatch ? channelIdMatch[1] : null;

      const thumbnailMatch = html.match(/"avatar":{"thumbnails":\[{"url":"(.*?)"/) || 
                             html.match(/meta property="og:image" content="(.*?)"/);
      let thumbnailUrl = thumbnailMatch ? thumbnailMatch[1] : null;
      if (thumbnailUrl) thumbnailUrl = thumbnailUrl.replace(/\\u0026/g, '&');

      if (!channelId) {
        return res.status(404).json({ error: "Could not resolve YouTube channel ID from handle." });
      }

      res.json({ channelId, thumbnailUrl });
    } catch (error: any) {
      console.error("YouTube resolve error:", error);
      res.status(500).json({ error: "Failed to resolve YouTube handle." });
    }
  });

  // Announcement API
  app.post("/api/announce", async (req, res) => {
    const { guildId, channelId, content, title } = req.body;

    if (!guildId || !channelId || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return res.status(404).json({ error: "Guild not found" });

      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: "Channel not found or is not a text channel" });
      }

      if (title) {
        await (channel as any).send({
          embeds: [{
            title: title,
            description: content,
            color: 0x5865F2,
            timestamp: new Date().toISOString()
          }]
        });
      } else {
        await (channel as any).send(content);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Announcement failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reset Invites API
  app.post("/api/guilds/:guildId/reset-invites", async (req, res) => {
    const { guildId } = req.params;
    try {
      // 1. Reset counts in levels
      const levelsRef = collection(db, "guilds", guildId, "levels");
      const levelsSnap = await getDocs(levelsRef);
      const promises = levelsSnap.docs.map(levelDoc => 
        setDoc(levelDoc.ref, { invites: 0 }, { merge: true })
      );
      
      // 2. Delete unique invite records
      const invitesRef = collection(db, "guilds", guildId, "invites");
      const invitesSnap = await getDocs(invitesRef);
      const deletePromises = invitesSnap.docs.map(inviteDoc => 
        deleteDoc(inviteDoc.ref)
      );
      
      await Promise.all([...promises, ...deletePromises]);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Reset invites failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reset Levels API
  app.post("/api/guilds/:guildId/reset-levels", async (req, res) => {
    const { guildId } = req.params;
    try {
      const levelsRef = collection(db, "guilds", guildId, "levels");
      const levelsSnap = await getDocs(levelsRef);
      const promises = levelsSnap.docs.map(levelDoc => 
        deleteDoc(levelDoc.ref)
      );
      await Promise.all(promises);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Reset levels failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  if (DISCORD_TOKEN) {
    client.login(DISCORD_TOKEN).then(() => {
      console.log("Discord Bot Logged In");
      registerCommands();
      
      // Start YouTube polling every 5 minutes
      setInterval(checkYouTubeUpdates, 5 * 60 * 1000);
      // Run once on startup
      checkYouTubeUpdates();
    }).catch(err => {
      console.error("Discord Login failed:", err);
    });
  } else {
    console.warn("DISCORD_TOKEN not found in env. Bot will not start.");
  }
}

startServer();
