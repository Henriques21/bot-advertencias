require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const config = require("./config.json");

const commands = [
  new SlashCommandBuilder()
    .setName("historico")
    .setDescription("Ver histórico de advertências")
    .addUserOption(opt =>
      opt.setName("membro")
        .setDescription("Selecione o membro")
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    console.log("✅ Comando /historico registrado!");
  } catch (e) {
    console.error("Erro deploy:", e);
  }
})();