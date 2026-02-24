const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events
} = require("discord.js");

const config = require("./config.json");
const db = require("./database.js");
const cron = require("node-cron");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ================= BOT ONLINE =================
client.once("ready", async () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);

  try {
    const canal = await client.channels.fetch(config.canalPrivado);
    if (!canal) return console.log("Canal privado não encontrado.");

    const mensagens = await canal.messages.fetch({ limit: 10 });
    const existePainel = mensagens.find(m => m.author.id === client.user.id);

    if (!existePainel) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: "Alemanha - Sistema de Advertências",
          iconURL: "https://imgur.com/NO9qpCn.png"
        })
        .setTitle("📋 PROTOCOLO DISCIPLINAR INTERNO")
        .setDescription(`🔴 **Advertência 1 — Falta Leve**
Erros menores que não afetam diretamente a operação.
Ex: atraso, desorganização, desrespeito leve.

🟠 **Advertência 2 — Falta Média**
Falhas que prejudicam a operação ou imagem da organização.
Ex: desobediência, falhar missão, reincidência em Adv. 1.

⚫ **Advertência 3 — Falta Grave**
Ações que colocam a organização em risco.
Ex: traição, vazamento de informações, sabotagem.

🚫 **Banimento / Blacklist**
Aplicado a traidores ou banidos do servidor.
Resultado: expulsão permanente e considerado inimigo.

✅ **Remover Advertência**
Use após pagamento, tempo expirado ou decisão da liderança.
Sempre registrar o motivo.

🚫 **Expulsar Membro**
Use em traição, reincidência grave ou ordem da liderança.

📍 Todas as ações são registradas no sistema interno.
  `)
        .setColor("DarkRed");

      if (config.logoURL) embed.setThumbnail(config.logoURL);
      if (config.bannerURL) embed.setImage(config.bannerURL);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aplicar").setLabel("Aplicar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("remover").setLabel("Remover").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("expulsar").setLabel("Expulsar").setStyle(ButtonStyle.Secondary)
      );

      await canal.send({ embeds: [embed], components: [row] });
    }
  } catch (e) {
    console.error("Erro painel:", e);
  }
});

// ================= PERMISSÃO STAFF =================
function isStaff(member) {
  return member && member.roles.cache.has(config.cargoStaff);
}

// ================= INTERAÇÕES =================
client.on(Events.InteractionCreate, async interaction => {

  // ================= BOTÕES =================
  if (interaction.isButton()) {

    if (!isStaff(interaction.member))
      return interaction.reply({ content: "Sem permissão.", ephemeral: true });

    // ===== APLICAR =====
    if (interaction.customId === "aplicar") {
      const modal = new ModalBuilder()
        .setCustomId("modalAplicar")
        .setTitle("Aplicar Advertência");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("usuario").setLabel("ID ou @").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("tipo").setLabel("leve | medio | grave").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    // ===== REMOVER =====
    if (interaction.customId === "remover") {
      const modal = new ModalBuilder()
        .setCustomId("modalRemover")
        .setTitle("Remover Advertência");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("usuarioRemover").setLabel("ID ou @").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("motivoRemover").setLabel("Motivo da remoção").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    // ===== EXPULSAR =====
    if (interaction.customId === "expulsar") {
      const modal = new ModalBuilder()
        .setCustomId("modalExpulsar")
        .setTitle("Expulsar Membro");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("usuarioExpulsar").setLabel("ID ou @").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("motivoExpulsao").setLabel("Motivo").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }
  }

  // ================= MODALS =================
  if (!interaction.isModalSubmit()) return;
  const guild = interaction.guild;
  const canalPublico = guild.channels.cache.get(config.canalPublico);

  // ===== APLICAR =====
  if (interaction.customId === "modalAplicar") {
    let user = interaction.fields.getTextInputValue("usuario").replace(/[<@!>]/g, "");
    let tipo = interaction.fields.getTextInputValue("tipo").toLowerCase();
    const motivo = interaction.fields.getTextInputValue("motivo");

    const membro = await guild.members.fetch(user).catch(() => null);
    if (!membro) return interaction.reply({ content: "Membro não encontrado", ephemeral: true });

    let valorNumero = 0;
    let valorTexto = "";
    let cargo;

    if (tipo === "leve") {
      valorNumero = 500000;
      valorTexto = "R$500.000";
      cargo = config.cargoLeve;
    } 
    else if (tipo === "medio") {
      valorNumero = 1000000;
      valorTexto = "R$1.000.000";
      cargo = config.cargoMedio;
    } 
    else if (tipo === "grave") {
      valorNumero = 2000000;
      valorTexto = "R$2.000.000";
      cargo = config.cargoGrave;
    } 
    else {
      return interaction.reply({ content: "Use leve | medio | grave", ephemeral: true });
    }

    await membro.roles.add(cargo);

    let tipoPublico = tipo === "leve" ? `<@&${config.roleAdv1}>` :
                     tipo === "medio" ? `<@&${config.roleAdv2}>` :
                     `<@&${config.roleAdv3}>`;

    const hoje = new Date();
    const expira = new Date();
    expira.setDate(hoje.getDate() + 7);
    const expiraFormatado = expira.toLocaleDateString("pt-BR");

    db.run(`
      INSERT INTO advertencias (usuario,tipo,motivo,valor,staff,dataAplicacao,dataExpiracao,ativa)
      VALUES (?,?,?,?,?,?,?,1)
    `, [membro.id, tipo, motivo, valorNumero, interaction.user.tag, hoje.toISOString(), expira.toISOString()]);

    const embed = new EmbedBuilder()
      .setAuthor({ name: "Alemanha - Sistema de Advertências", iconURL: "https://imgur.com/NO9qpCn.png" })
      .setTitle("⚠️ ADVERTÊNCIA APLICADA")
      .setColor("DarkRed")
      .addFields(
        { name: "👤 Nome", value: `${membro}`, inline: true },
        { name: "📌 Tipo", value: tipoPublico, inline: true },
        { name: "💰 Multa", value: valorTexto, inline: true },
        { name: "📅 Data limite", value: expiraFormatado, inline: true },
        { name: "📝 Motivo", value: motivo }
      )
      .setFooter({ text: `Aplicado por ${interaction.user.tag}` })
      .setTimestamp();

    canalPublico.send({ embeds: [embed] });
    return interaction.reply({ content: "Advertência aplicada.", ephemeral: true });
  }

  // ===== REMOVER =====
  if (interaction.customId === "modalRemover") {
    let user = interaction.fields.getTextInputValue("usuarioRemover").replace(/[<@!>]/g, "");
    const motivoRemover = interaction.fields.getTextInputValue("motivoRemover");

    const membro = await guild.members.fetch(user).catch(() => null);
    if (!membro) return interaction.reply({ content: "Membro não encontrado", ephemeral: true });

    db.get("SELECT * FROM advertencias WHERE usuario=? AND ativa=1", [membro.id], async (err, row) => {
      if (!row) return interaction.reply({ content: "Sem advertência ativa", ephemeral: true });

      // REMOVE TODOS OS CARGOS
      await membro.roles.remove(config.cargoLeve).catch(()=>{});
      await membro.roles.remove(config.cargoMedio).catch(()=>{});
      await membro.roles.remove(config.cargoGrave).catch(()=>{});

      db.run("UPDATE advertencias SET ativa=0 WHERE id=?", [row.id]);

      const embed = new EmbedBuilder()
        .setAuthor({ name: "Alemanha - Sistema de Advertências", iconURL: "https://imgur.com/NO9qpCn.png" })
        .setTitle("✅ ADVERTÊNCIA REMOVIDA")
        .setColor("Green")
        .addFields(
          { name: "👤 Nome", value: `${membro}`, inline: true },
          { name: "👮 Removido por", value: interaction.user.tag, inline: true },
          { name: "📝 Motivo", value: motivoRemover }
        )
        .setTimestamp();

      canalPublico.send({ embeds: [embed] });
      return interaction.reply({ content: "Advertência removida.", ephemeral: true });
    });
  }

  // ===== EXPULSAR =====
  if (interaction.customId === "modalExpulsar") {
    let user = interaction.fields.getTextInputValue("usuarioExpulsar").replace(/[<@!>]/g, "");
    const motivo = interaction.fields.getTextInputValue("motivoExpulsao");

    const membro = await guild.members.fetch(user).catch(() => null);
    if (!membro) return interaction.reply({ content: "Membro não encontrado", ephemeral: true });

    await membro.kick(motivo);
    canalPublico.send(`🚫 ${membro} foi expulso.\nMotivo: ${motivo}`);
    return interaction.reply({ content: "Expulso.", ephemeral: true });
  }
});

// ================= EXPIRAR AUTOMÁTICO =================
cron.schedule("0 * * * *", () => {
  db.all("SELECT * FROM advertencias WHERE ativa=1", async (err, rows) => {
    for (const adv of rows) {
      if (new Date(adv.dataExpiracao) <= new Date()) {
        const guild = await client.guilds.fetch(config.guildId);
        const membro = await guild.members.fetch(adv.usuario).catch(() => null);
        if (!membro) continue;

        await membro.roles.remove(config.cargoLeve).catch(()=>{});
        await membro.roles.remove(config.cargoMedio).catch(()=>{});
        await membro.roles.remove(config.cargoGrave).catch(()=>{});

        db.run("UPDATE advertencias SET ativa=0 WHERE id=?", [adv.id]);
      }
    }
  });
});

client.login(config.token);