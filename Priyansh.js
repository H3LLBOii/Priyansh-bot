const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const chalk = require('chalk');
const logger = require("./utils/log.js");
const login = require("fca-priyansh");
const stringSimilarity = require("string-similarity");

console.log(chalk.bold.hex("#00ffff")("[ PRIYANSH BOT ] » ") + chalk.bold.hex("#00ffff")("Starting..."));

// GLOBAL SETUP
global.client = {
    commands: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: [],
    handleSchedule: [],
    handleReaction: [],
    handleReply: [],
    mainPath: process.cwd(),
    configPath: ""
};

global.data = {
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: [],
    allUserID: [],
    allCurrenciesID: [],
    allThreadID: [],
    loopIntervals: {},
    mkcIntervals: {},
    mkcIndexes: {},
    npUIDs: [],
    groupNameLocks: {},
    autoResponds: [
{ triggers: ["mayank gandu", "mayank lodu", "mayank jhaatu"], reply: "teri ma ka bhosda mayank baap hai tera smjha madrchod 😒" },
{ triggers: ["mayank madrchod", "mayank teri ma ki chut"], reply: "ban gya hoshiyar apne pita ji ko gali deke bol ab teri ma chod du idhar bhen ke lode😏" },
{ triggers: ["mayank gand", "arav mc", "arav madrchod", "arav randi", "arav lodu", "arav gand", "arav bhen", "mayank randi ke bache"], reply: "teri ma ki chut faar dunga sale baap ko gali deta hai madrchod ki nsaal🩵" },
{ triggers: ["mayank mkc", "mayank rkb"], reply: "rand ke bete dediya mayank jaise axhe bache ko gali use gali ni dene ata to tu hoshiyar ban rahaa madrchod😒😒" },
{ triggers: ["mayank sale", "mayank bhsdk", "mayank randi", "mayank lodu"], reply: "tu kitni bhi koshis kr lekin teri maaa mai nahi chodunga mayank chodega 😎" },
{ triggers: ["mayank lode", "mayank bhosdi", "mayank randi", "mayank bc", "mayank mc", "mayank teri mkc", "mayank chutiya", "mayank bkl"], reply: "mayank bhay is bkl ko pel du aap bolo to bahut uchal raha mc😠" }
],
    targetMode: false,
    targetUIDs: []
};

function loadTargetUIDs() {
    try {
        const content = readFileSync("target.txt", "utf-8")
            .split(/\r?\n/)
            .map(x => x.trim())
            .filter(x => x !== "");
        global.data.targetUIDs = content;
        console.log(chalk.green(`🎯 Loaded ${content.length} target UIDs.`));
    } catch (e) {
        global.data.targetUIDs = [];
        console.log(chalk.red("❌ Failed to load target.txt"));
    }
}

loadTargetUIDs();

global.utils = require("./utils");
global.nodemodule = {};
global.config = {};
global.configModule = {};
global.moduleData = [];
global.language = {};

try {
    global.client.configPath = join(global.client.mainPath, "config.json");
    const configRaw = existsSync(global.client.configPath)
        ? require(global.client.configPath)
        : JSON.parse(readFileSync(global.client.configPath + ".temp", 'utf8'));
    for (const key in configRaw) global.config[key] = configRaw[key];
    logger.loader("✅ Config Loaded!");
    writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');
} catch (e) {
    logger.loader("❌ config.json not found or failed to load!", "error");
    process.exit(1);
}

let appState;
try {
    const appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    appState = require(appStateFile);
    logger.loader("✅ Appstate Loaded!");
} catch {
    logger.loader("❌ Appstate not found!", "error");
    process.exit(1);
}

const OWNER_UIDS = global.config.OWNER_UIDS || ["61571633498434", "100056888269923", "61563667651181", ""];

login({ appState }, async (err, api) => {
    if (err) return logger("❌ Login Failed", "error");

    logger("✅ Login successful! Starting bot...");

    setInterval(() => {
        for (const threadID in global.data.groupNameLocks) {
            const lockedName = global.data.groupNameLocks[threadID];
            api.getThreadInfo(threadID, (err, info) => {
                if (!err && info.threadName !== lockedName) {
                    api.setTitle(lockedName, threadID);
                }
            });
        }
    }, 5000);

    api.listenMqtt(async (err, event) => {
        if (err || !event.body || !event.senderID) return;

        const senderID = event.senderID;
        const threadID = event.threadID;
        const messageID = event.messageID;
        const body = event.body.trim();
        const lowerBody = body.toLowerCase();

        // ✅ Admin UID set karo
const ADMIN_UID = "61571633498434"; // <-- Apna UID yahan daalo

// ✅ Admin-only triggers
if (event.senderID === ADMIN_UID && event.body) {
    const msg = event.body.toLowerCase();

    if (msg.includes("sena pati")) {
        api.sendMessage("🫡Kya hua maharaj kiski ma chodni hai batao abhi chod deta hun 🙋🏻🙇🏻", event.threadID, event.messageID);
        return;
    }

    if (msg.includes("kaisi hai")) {
        api.sendMessage("arey iski ma ek number ki randi hai sale ki ma ka bhosda bhi kala hai🤮😒", event.threadID, event.messageID);
        return;
    }
    
    if (msg.includes("pehnti hai")) {
        api.sendMessage("iski ma black or green panty pehnti hai😒", event.threadID, event.messageID);
        return;
    }
    
    if (msg.includes("galat jawab")) {
        api.sendMessage("acha phir pkka usne pink pehen rkhi hai lekin iski mummy ki chut hai kali hee🤮😒", event.threadID, event.messageID);
        return;
    }

    if (msg.includes("jai ho")) {
        api.sendMessage("jai ho jai ho🙋🏻😂", event.threadID, event.messageID);
        return;
    }
}
     

        // 🎯 Target Mode Logic
        if (global.data.targetMode && global.data.targetUIDs.includes(senderID)) {
            try {
                const lines = readFileSync("no.txt", "utf-8")
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(line => line !== "");
                if (lines.length > 0) {
                    const randomLine = lines[Math.floor(Math.random() * lines.length)];
                    return api.sendMessage(randomLine, threadID, messageID);
                }
            } catch (err) {
                console.log(chalk.red("❌ Failed to read no.txt"), err);
            }
        }

        if (global.data.npUIDs.includes(senderID)) {
            try {
                const lines = readFileSync("np.txt", "utf-8").split(/\r?\n/).filter(line => line.trim() !== "");
                const randomLine = lines[Math.floor(Math.random() * lines.length)];
                if (randomLine) api.sendMessage({ body: randomLine }, threadID, messageID);
            } catch {}
        }
      // 🔁 Enhanced Auto-Response Logic with Fuzzy Matching — STRICTER VERSION
// 🎯 Fuzzy autorespond  
    for (const { triggers, reply } of global.data.autoResponds) {  
        const matched = triggers.some(trigger => stringSimilarity.compareTwoStrings(lowerBody, trigger) > 0.7);  
        if (matched) {  
            return api.sendMessage(reply, threadID, messageID);  
        }  
    }  
   
      
        if (body.startsWith("!")) {
            const args = body.slice(1).trim().split(/\s+/);
            const command = args.shift().toLowerCase();

            if (!OWNER_UIDS.includes(senderID)) return;

            switch (command) {
case "exit": {
  if (!event.isGroup) return api.sendMessage("❌ Ye command sirf groups me kaam karti hai.", threadID, messageID);

  api.sendMessage("tum log gand marao m chala is jhantu groupse ", threadID, () => {
    api.removeUserFromGroup(api.getCurrentUserID(), threadID, (err) => {
      if (err) return api.sendMessage("❌ Error leaving the group.", threadID, messageID);
    });
  });

  return;
                    }
                case "ping":
                    return api.sendMessage("pong ✅", threadID, messageID);
                case "hello":
                    return api.sendMessage("Hello Owner 😎", threadID, messageID);
                    
 case "wave":
    {
        const text = args.join(" ");
        if (!text) return api.sendMessage("❌ Kuch to likho!", threadID, messageID);

        let wave = "";
        for (let i = 0; i < text.length; i++) {
            wave += " ".repeat(i) + text[i] + "\n";
        }

        api.sendMessage(wave, threadID, messageID);
    }
    break;
 case "detectlove":
    {
        // Check: Kisi ko tag kiya hai ya nahi
        if (!event.mentions || Object.keys(event.mentions).length === 0)
            return api.sendMessage("❌ Kisi ko tag to karo jiske sath match check karna hai 💞", threadID, messageID);

        // Get names and IDs
        const taggedUID = Object.keys(event.mentions)[0];
        const taggedName = event.mentions[taggedUID];
        const senderName = (await api.getUserInfo(senderID))[senderID].name;

        // Random % between 0–100
        const lovePercent = Math.floor(Math.random() * 101);

        // Emoji-based bar
        const barLength = 10;
        const filled = Math.floor(lovePercent / 10);
        const empty = barLength - filled;
        const loveBar = "❤️".repeat(filled) + "🖤".repeat(empty);

        // Response message
        const message = `💘 Love Detection 💘\n\n` +
            `🧍 You: ${senderName}\n` +
            `💃 Partner: ${taggedName}\n\n` +
            `❤️ Match: ${lovePercent}%\n` +
            `${loveBar}`;

        api.sendMessage(message, threadID, messageID);
    }
    break;
                    
                    
 case "spamline":
    {
        const times = parseInt(args[0]) || 5;
        const msg = args.slice(1).join(" ") || "🚀 Message!";
        if (times > 200) return api.sendMessage("❌ Max 200 allowed!", threadID, messageID);
        
        let final = "";
        for (let i = 0; i < times; i++) {
            final += `${msg}\n`;
        }

        api.sendMessage(final, threadID);
    }
    break;
case "pel": {
  const name = args[0];
  const delay = parseInt(args[1]) || 10; // default 10s

  if (!name) return api.sendMessage("⚠️ Use: !pel <name> <delay>", threadID, messageID);

  const pelPath = join(__dirname, "pel.txt"); // 🔁 Use destructured join
  if (!existsSync(pelPath)) {
    return api.sendMessage("❌ pel.txt file not found!", threadID, messageID);
  }

  const lines = readFileSync(pelPath, "utf8").split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return api.sendMessage("⚠️ pel.txt file is empty!", threadID, messageID);

  if (global.data.loopIntervals[threadID]) {
    return api.sendMessage("⚠️ Pehle se chal raha hai! Use !matpel to stop.", threadID, messageID);
  }

  let index = 0;
  global.data.loopIntervals[threadID] = setInterval(() => {
    if (index >= lines.length) index = 0;
    const msg = lines[index].replace(/<name>/g, name);
    api.sendMessage(msg, threadID);
    index++;
  }, delay * 1000);

  api.sendMessage(`ab teri ma chudegi smjha ${name} | Delay: ${delay}s`, threadID, messageID);
}
break;

case "matpel": {
  if (!global.data.loopIntervals[threadID]) return api.sendMessage("⚠️ Abhi kuch nahi chal raha is group me.", threadID, messageID);

  clearInterval(global.data.loopIntervals[threadID]);
  delete global.data.loopIntervals[threadID];
  api.sendMessage("🛑 Pelting stopped in this group!", threadID, messageID);
}
break;

                    
                case "help":
                    return api.sendMessage(`🛠 Available Commands:
• !ping
• !hello
• !help
• !loopmsg <message>
• !stoploop
• !npadd <uid>
• !npremove <uid>
• !pel name seccond
• !matpel
• !nplist
• !emojirain ur emoji
• !spamline 10 😎 Hello
• !rainbowspam ur msg
• !wave [msg]
• !detectlove @Pooja
• !groupnamelock <name|off>
• !nickall <nickname>
• !mkc <prefix> | <seconds>
• !stopmkc
• !targetstart`, threadID, messageID);
case "uid": {
    // Check if user mentioned someone
    const mentions = event.mentions;
    if (args[0] === "all") {
        api.getThreadInfo(threadID, (err, info) => {
            if (err) return api.sendMessage("❌ Error fetching group info.", threadID, messageID);
            const list = info.participantIDs.map(id => `• ${id}`).join("\n");
            return api.sendMessage(`👥 Group Member UIDs:\n${list}`, threadID, messageID);
        });
        return;
    }

    if (Object.keys(mentions).length > 0) {
        const reply = Object.entries(mentions).map(([uid, name]) => `${name}: ${uid}`).join("\n");
        return api.sendMessage(`📌 Mentioned UID(s):\n${reply}`, threadID, messageID);
    }

    return api.sendMessage("❌ Usage:\n• !uid @mention\n• !uid all", threadID, messageID);
                    }
             case "groupid":
                     return api.sendMessage(`kya hua mayank bhai kisi ka maa chodani hai kya group id mangrahe ho:\n${threadID}`, threadID, messageID);  
case "rainbowspam":
    {
        const text = args.join(" ") || "🌈 Rainbow Spam!";
        const colors = ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣"];
        for (let i = 0; i < colors.length; i++) {
            api.sendMessage(`${colors[i]} ${text}`, threadID);
        }
    }
    break;
                    
                case "loopmsg": {
                    const loopMessage = args.join(" ");
                    if (!loopMessage) return api.sendMessage("❌ Usage: !loopmsg <message>", threadID, messageID);
                    if (global.data.loopIntervals[threadID]) return api.sendMessage("⚠️ Loop already running in this thread! Use !stoploop.", threadID, messageID);
                    api.sendMessage(`🔁 Loop started in this thread. Sending every 15s.\nUse !stoploop to stop.`, threadID);
                    global.data.loopIntervals[threadID] = setInterval(() => {
                        api.sendMessage(loopMessage, threadID);
                    }, 15000);
                    return;
                }

                case "stoploop":
                    if (!global.data.loopIntervals[threadID]) return api.sendMessage("⚠️ No active loop in this thread.", threadID, messageID);
                    clearInterval(global.data.loopIntervals[threadID]);
                    delete global.data.loopIntervals[threadID];
                    return api.sendMessage("🛑 Loop stopped in this thread.", threadID, messageID);

                case "mkc": {
                    const input = args.join(" ").split("|").map(x => x.trim());
                    if (input.length !== 2) return api.sendMessage("❌ Usage: !mkc <prefix> | <seconds>", threadID, messageID);
                    const prefix = input[0];
                    const intervalSec = parseInt(input[1]);
                    if (isNaN(intervalSec) || intervalSec < 1) return api.sendMessage("❌ Invalid seconds. Example: !mkc Rajeev 😒 | 5", threadID, messageID);
                    let lines;
                    try {
                        lines = readFileSync("msg.txt", "utf-8").split(/\r?\n/).filter(line => line.trim() !== "");
                    } catch {
                        return api.sendMessage("❌ msg.txt file not found!", threadID, messageID);
                    }
                    if (global.data.mkcIntervals[threadID]) return api.sendMessage("⚠️ MKC loop already running in this thread! Use !stopmkc.", threadID, messageID);
                    api.sendMessage(`🔁 MKC loop started with prefix: "${prefix}" and ${intervalSec}s delay.\nUse !stopmkc to stop.`, threadID);
                    global.data.mkcIndexes[threadID] = 0;
                    global.data.mkcIntervals[threadID] = setInterval(() => {
                        if (global.data.mkcIndexes[threadID] >= lines.length) global.data.mkcIndexes[threadID] = 0;
                        const msg = `${prefix} ${lines[global.data.mkcIndexes[threadID]++]}`;
                        api.sendMessage(msg, threadID);
                    }, intervalSec * 1000);
                    return;
                }

                case "stopmkc":
                    if (!global.data.mkcIntervals[threadID]) return api.sendMessage("⚠️ No MKC loop running in this thread.", threadID, messageID);
                    clearInterval(global.data.mkcIntervals[threadID]);
                    delete global.data.mkcIntervals[threadID];
                    delete global.data.mkcIndexes[threadID];
                    return api.sendMessage("🛑 MKC loop stopped in this thread.", threadID, messageID);

                    
                case "npadd": {
                    const uid = args[0];
                    if (!uid) return api.sendMessage("❌ Usage: !npadd <uid>", threadID, messageID);
                    if (!global.data.npUIDs.includes(uid)) {
                        global.data.npUIDs.push(uid);
                        return api.sendMessage(`✅ UID ${uid} added to NP list.`, threadID, messageID);
                    } else return api.sendMessage("⚠️ UID already exists in NP list.", threadID, messageID);
                }

                case "npremove": {
                    const uid = args[0];
                    if (!uid) return api.sendMessage("❌ Usage: !npremove <uid>", threadID, messageID);
                    global.data.npUIDs = global.data.npUIDs.filter(u => u !== uid);
                    return api.sendMessage(`✅ UID ${uid} removed from NP list.`, threadID, messageID);
                }

                case "nplist":
                    return api.sendMessage(`📋 NP UIDs:\n${global.data.npUIDs.join("\n") || "(none)"}`, threadID, messageID);

                case "groupnamelock": {
                    const groupName = args.join(" ");
                    if (!groupName) return api.sendMessage("❌ Usage: !groupnamelock <name|off>", threadID, messageID);
                    if (groupName.toLowerCase() === "off") {
                        delete global.data.groupNameLocks[threadID];
                        return api.sendMessage("🔓 Group name lock disabled.", threadID, messageID);
                    }
                    global.data.groupNameLocks[threadID] = groupName;
                    api.setTitle(groupName, threadID);
                    return api.sendMessage(`🔐 Group name locked to: ${groupName}`, threadID, messageID);
                }

                case "nickall": {
                    const newNick = args.join(" ");
                    if (!newNick) return api.sendMessage("❌ Usage: !nickall <nickname>", threadID, messageID);
                    api.getThreadInfo(threadID, async (err, info) => {
                        if (err) return api.sendMessage("❌ Failed to get thread info.", threadID, messageID);
                        const members = info.participantIDs.filter(id => id !== api.getCurrentUserID());
                        api.sendMessage(`🔁 Changing nicknames of ${members.length} members to \"${newNick}\" (3s delay)...`, threadID);
                        for (let i = 0; i < members.length; i++) {
                            const userID = members[i];
                            setTimeout(() => {
                                api.changeNickname(newNick, threadID, userID, err => {
                                    if (err) console.log(`❌ Failed for UID: ${userID}`);
                                });
                            }, i * 3000);
                        }
                    });
                    return;
                }

                case "targetstart":
                    global.data.targetMode = true;
                    return api.sendMessage("🎯 Target mode activated. Will reply to UIDs listed in target.txt using no.txt", threadID, messageID);

                default:
                    return api.sendMessage(`❌ Unknown command: ${command}`, threadID, messageID);
            }
        }
    });
});
