const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const { join, resolve } = require("path");
const chalk = require("chalk");
const login = require("fca-priyansh");
const stringSimilarity = require("string-similarity");
const logger = require("./utils/log.js");

console.log(chalk.bold.hex("#00ffff")("[ PRIYANSH BOT ] » ") + chalk.bold.hex("#00ffff")("Starting..."));

global.client = {
    mainPath: process.cwd(),
    configPath: "",
};

global.data = {
    npUIDs: [],
    loopIntervals: {},
    mkcIntervals: {},
    mkcIndexes: {},
    groupNameLocks: {},
    imgLoops: {},
    autoResponds: [
        { triggers: ["mayank gandu", "mayank lodu", "mayank jhaatu"], reply: "teri ma ka bhosda mayank baap hai tera smjha madrchod 😔" },
        { triggers: ["mayank madrchod", "mayank teri ma ki chut"], reply: "ban gya hoshiyar apne pita ji ko gali deke bol ab teri ma chod du idhar bhen ke lode😏" },
        { triggers: ["mayank gand", "mayank randi ke bache"], reply: "teri ma ki chut faar dunga sale baap ko gali deta hai madrchod ki nsaal🦥" },
        { triggers: ["mayank mkc", "mayank rkb"], reply: "rand ke bete dediya mayank jaise axhe bache ko gali use gali ni dene ata to tu hoshiyar ban rahaa madrchod😔😔" },
        { triggers: ["mayank sale", "mayank bhsdk", "mayank randi", "mayank lodu"], reply: "tu kitni bhi koshis kr lekin teri maaa mai nahi chodunga mayank chodega 😎" },
        { triggers: ["mayank lode", "mayank chutiya", "mayank bkl"], reply: "mayank bhay is bkl ko pel du aap bolo to bahut uchal raha mc😠" }
    ]
};

global.config = {};

try {
    global.client.configPath = join(global.client.mainPath, "config.json");
    const configRaw = existsSync(global.client.configPath)
        ? require(global.client.configPath)
        : JSON.parse(readFileSync(global.client.configPath + ".temp", 'utf8'));
    Object.assign(global.config, configRaw);
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

const OWNER_UIDS = global.config.OWNER_UIDS || ["61571633498434"];

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

        const { threadID, senderID, messageID } = event;
        const body = event.body.trim();
        const lowerBody = body.toLowerCase();

        for (const { triggers, reply } of global.data.autoResponds) {
            const matched = triggers.some(trigger => stringSimilarity.compareTwoStrings(lowerBody, trigger) > 0.7);
            if (matched) {
                return api.sendMessage(reply, threadID, messageID);
            }
        }

        if (global.data.npUIDs.includes(senderID)) {
            try {
                const lines = readFileSync("np.txt", "utf-8").split(/\r?\n/).filter(x => x.trim());
                const random = lines[Math.floor(Math.random() * lines.length)];
                if (random) return api.sendMessage(random, threadID, messageID);
            } catch { }
        }

        if (!body.startsWith("=")) return;

        const args = body.slice(1).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        if (!OWNER_UIDS.includes(senderID)) return;

        switch (command) {
            case "ping":
                return api.sendMessage("pong ✅", threadID, messageID);

            case "hello":
                return api.sendMessage("Hello Owner 😎", threadID, messageID);

            case "help":
                return api.sendMessage(`🛠 Available Commands:  

• !ping
• !hello
• !help
• !loopmsg 
• !stoploop
• !npadd 
• !npremove 
• !nplist
• !groupnamelock <name|off>
• !nickall 
• !mkc  | 
• !stopmkc
• !uid [@mention]
• !exit );

            case "loopmsg": {
                const msg = args.join(" ");
                if (!msg) return api.sendMessage("❌ Usage: !loopmsg <message>", threadID, messageID);
                if (global.data.loopIntervals[threadID])
                    return api.sendMessage("⚠️ Loop already running! Use !stoploop", threadID, messageID);
                api.sendMessage("🔁 Loop started (15s interval). Use !stoploop to stop.", threadID);
                global.data.loopIntervals[threadID] = setInterval(() => {
                    api.sendMessage(msg, threadID);
                }, 15000);
                break;
            }

            case "stoploop":
                if (!global.data.loopIntervals[threadID])
                    return api.sendMessage("⚠️ No loop running.", threadID, messageID);
                clearInterval(global.data.loopIntervals[threadID]);
                delete global.data.loopIntervals[threadID];
                return api.sendMessage("🛑 Loop stopped.", threadID, messageID);

            case "npadd": {
                const addUID = args[0];
                if (!addUID) return api.sendMessage("❌ Usage: !npadd <uid>", threadID, messageID);
                if (!global.data.npUIDs.includes(addUID)) {
                    global.data.npUIDs.push(addUID);
                    return api.sendMessage(`✅ UID ${addUID} added to NP list.`, threadID, messageID);
                }
                return api.sendMessage("⚠️ UID already in NP list.", threadID, messageID);
            }

            case "npremove": {
                const removeUID = args[0];
                if (!removeUID) return api.sendMessage("❌ Usage: !npremove <uid>", threadID, messageID);
                global.data.npUIDs = global.data.npUIDs.filter(u => u !== removeUID);
                return api.sendMessage(`✅ UID ${removeUID} removed from NP list.`, threadID, messageID);
            }

            case "nplist":
                return api.sendMessage(`📋 NP UIDs:\n${global.data.npUIDs.join("\n") || "(none)"}`, threadID, messageID);

            case "groupnamelock": {
                const name = args.join(" ");
                if (!name) return api.sendMessage("❌ Usage: !groupnamelock <name|off>", threadID, messageID);
                if (name.toLowerCase() === "off") {
                    delete global.data.groupNameLocks[threadID];
                    return api.sendMessage("🔓 Group name lock removed.", threadID, messageID);
                }
                global.data.groupNameLocks[threadID] = name;
                api.setTitle(name, threadID);
                return api.sendMessage(`🔐 Group name locked to: ${name}`, threadID, messageID);
            }

            case "nickall": {
                const newNick = args.join(" ");
                if (!newNick) return api.sendMessage("❌ Usage: !nickall <nickname>", threadID, messageID);
                api.getThreadInfo(threadID, (err, info) => {
                    if (err) return api.sendMessage("❌ Can't fetch members.", threadID, messageID);
                    const members = info.participantIDs.filter(id => id !== api.getCurrentUserID());
                    api.sendMessage(`🔁 Changing nicknames of ${members.length} members...`, threadID);
                    members.forEach((uid, i) => {
                        setTimeout(() => {
                            api.changeNickname(newNick, threadID, uid);
                        }, i * 3000);
                    });
                });
                break;
            }

            case "mkc": {
                const [prefix, sec] = body.slice(5).split("|").map(s => s.trim());
                const intervalSec = parseInt(sec);
                if (!prefix || isNaN(intervalSec)) return api.sendMessage("❌ Usage: !mkc <prefix> | <seconds>", threadID, messageID);

                let lines;
                try {
                    lines = readFileSync("msg.txt", "utf-8").split(/\r?\n/).filter(line => line.trim());
                } catch {
                    return api.sendMessage("❌ msg.txt not found!", threadID, messageID);
                }

                if (global.data.mkcIntervals[threadID])
                    return api.sendMessage("⚠️ MKC already running. Use !stopmkc.", threadID, messageID);

                api.sendMessage(`🔁 MKC started with prefix \"${prefix}\". Use !stopmkc to stop.`, threadID);
                global.data.mkcIndexes[threadID] = 0;
                global.data.mkcIntervals[threadID] = setInterval(() => {
                    const index = global.data.mkcIndexes[threadID]++;
                    if (index >= lines.length) global.data.mkcIndexes[threadID] = 0;
                    api.sendMessage(`${prefix} ${lines[index % lines.length]}`, threadID);
                }, intervalSec * 1000);
                break;
            }

            case "stopmkc":
                if (!global.data.mkcIntervals[threadID])
                    return api.sendMessage("⚠️ No MKC running.", threadID, messageID);
                clearInterval(global.data.mkcIntervals[threadID]);
                delete global.data.mkcIntervals[threadID];
                delete global.data.mkcIndexes[threadID];
                return api.sendMessage("🛑 MKC stopped.", threadID, messageID);

            case "uid": {
                const mentions = event.mentions;
                const keys = Object.keys(mentions);
                if (keys.length > 0) {
                    const mentionName = mentions[keys[0]];
                    return api.sendMessage(`${mentionName}'s UID is: ${keys[0]}`, threadID, messageID);
                } else {
                    return api.sendMessage(`Your UID is: ${senderID}`, threadID, messageID);
                }
            }

            case "exit": {
    if (!OWNER_UIDS.includes(senderID)) return;
    if (!event.isGroup) return api.sendMessage("❌ This command only works in group chats.", threadID, messageID);

    api.sendMessage("👋 Leaving the group...", threadID, () => {
        try {
            if (typeof api.leaveGroup === "function") {
                api.leaveGroup(threadID);
            } else {
                api.removeUserFromGroup(api.getCurrentUserID(), threadID);
            }
        } catch (e) {
            api.sendMessage("❌ Failed to leave the group. Please remove manually.", threadID);
        }
    });
    break;
}

            default:
                return api.sendMessage(`❌ Unknown command: ${command}`, threadID, messageID);
        }
    });
});
