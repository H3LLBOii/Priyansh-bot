const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const chalk = require('chalk');
const logger = require("./utils/log.js");
const login = require("fca-priyansh");

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
        { triggers: ["hello bot", "hi bot", "yo bot"], reply: "Hi there! 🤖" },
        { triggers: ["how are you", "what's up"], reply: "I'm just code, but doing great! 😄" },
        { triggers: ["bye", "goodbye"], reply: "Goodbye! Have a nice day! 👋" },
        { triggers: ["who are you", "your name"], reply: "I'm your friendly assistant bot. 😊" },
        { triggers: ["owner", "bot creator"], reply: "This bot was created by mayank! 😎" }
    ]
};

global.utils = require("./utils");
global.nodemodule = {};
global.config = {};
global.configModule = {};
global.moduleData = [];
global.language = {};

// Load config.json
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

// Load appstate
let appState;
try {
    const appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    appState = require(appStateFile);
    logger.loader("✅ Appstate Loaded!");
} catch {
    logger.loader("❌ Appstate not found!", "error");
    process.exit(1);
}

// Load NP UID list from file
const NP_UID_FILE = join(global.client.mainPath, "np_uids.json");
if (existsSync(NP_UID_FILE)) {
    try {
        global.data.npUIDs = JSON.parse(readFileSync(NP_UID_FILE, "utf8"));
        logger.loader("✅ NP UIDs loaded from np_uids.json!");
    } catch (e) {
        logger.loader("❌ Failed to load np_uids.json, using empty list.", "error");
        global.data.npUIDs = [];
    }
} else {
    global.data.npUIDs = [];
    writeFileSync(NP_UID_FILE, JSON.stringify([], null, 2));
}

const OWNER_UIDS = global.config.OWNER_UIDS || ["61571633498434", "", "", ""];

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

        if (global.data.npUIDs.includes(senderID)) {
            try {
                const lines = readFileSync("np.txt", "utf-8").split(/\r?\n/).filter(line => line.trim() !== "");
                const randomLine = lines[Math.floor(Math.random() * lines.length)];
                if (randomLine) api.sendMessage({ body: randomLine }, threadID, messageID);
            } catch {}
        }

        for (const { triggers, reply } of global.data.autoResponds) {
            if (triggers.some(trigger => lowerBody.includes(trigger))) {
                return api.sendMessage(reply, threadID, messageID);
            }
        }

        if (body.startsWith("!")) {
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
• !loopmsg <message>
• !stoploop
• !npadd <uid>
• !npremove <uid>
• !nplist
• !groupnamelock <name|off>
• !nickall <nickname>
• !mkc <prefix> | <seconds>
• !stopmkc`, threadID, messageID);
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
                        writeFileSync(NP_UID_FILE, JSON.stringify(global.data.npUIDs, null, 2));
                        return api.sendMessage(`✅ UID ${uid} added to NP list.`, threadID, messageID);
                    } else return api.sendMessage("⚠️ UID already exists in NP list.", threadID, messageID);
                }
                case "npremove": {
                    const uid = args[0];
                    if (!uid) return api.sendMessage("❌ Usage: !npremove <uid>", threadID, messageID);
                    global.data.npUIDs = global.data.npUIDs.filter(u => u !== uid);
                    writeFileSync(NP_UID_FILE, JSON.stringify(global.data.npUIDs, null, 2));
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
                default:
                    return api.sendMessage(`❌ Unknown command: ${command}`, threadID, messageID);
            }
        }
    });
});
