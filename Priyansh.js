const {
    readdirSync,
    readFileSync,
    writeFileSync,
    existsSync,
    unlinkSync,
    rm,
    appendFileSync
} = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const chalk = require('chalk');
const logger = require("./utils/log.js");
const login = require("fca-priyansh");
const axios = require("axios");
const fs = require("fs");

console.log(chalk.bold.hex("#00ffff")("[ PRIYANSH RAJPUT (PRIYANSH) ] » ") + chalk.bold.hex("#00ffff")("Initializing variables..."));

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
    allThreadID: []
};

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

// Load language
const langFile = readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, "utf8").split(/\r?\n|\r/);
for (const item of langFile) {
    if (item.startsWith('#') || item === '') continue;
    const [itemKey, itemValue] = item.split('=');
    const head = itemKey.slice(0, itemKey.indexOf('.'));
    const key = itemKey.replace(`${head}.`, '');
    if (!global.language[head]) global.language[head] = {};
    global.language[head][key] = itemValue.replace(/\\n/g, '\n');
}

global.getText = function (...args) {
    const langText = global.language;
    if (!langText.hasOwnProperty(args[0])) throw `Language key not found: ${args[0]}`;
    let text = langText[args[0]][args[1]];
    for (let i = args.length - 1; i > 1; i--) text = text.replace(RegExp(`%${i}`, 'g'), args[i]);
    return text;
};

let appState;
try {
    const appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    appState = require(appStateFile);
    logger.loader(global.getText("priyansh", "foundPathAppstate"));
} catch {
    logger.loader(global.getText("priyansh", "notFoundPathAppstate"), "error");
    process.exit(1);
}

const OWNER_UIDS = global.config.OWNER_UIDS || ["61571633498434", "", ""];
const groupNameLocks = new Map();
let targetUIDs = [];
const targetPath = "./target.txt";
const targetReplyPath = "./targetmsg.txt";
const lastReplied = new Map();

// Load existing targets
if (existsSync(targetPath)) {
    targetUIDs = fs.readFileSync(targetPath, "utf8").split("\n").filter(Boolean);
}

login({ appState }, async (err, api) => {
    if (err) return logger("❌ Login Failed", "error");

    logger("✅ Login successful! Starting bot...");

    api.listenMqtt(async (err, event) => {
        if (err || !event.senderID) return;

        const { senderID, threadID, messageID, body = "", type } = event;
        const isCmd = body.startsWith("!");
        const isOwner = OWNER_UIDS.includes(senderID);

        // Command handling
        if (isCmd && isOwner) {
            const args = body.slice(1).trim().split(/\s+/);
            const command = args.shift().toLowerCase();

            switch (command) {
                case "groupnamelock":
                    api.getThreadInfo(threadID, (err, info) => {
                        if (err) return api.sendMessage("❌ Can't lock name", threadID, messageID);
                        groupNameLocks.set(threadID, info.name);
                        api.sendMessage("🔒 Group name locked!", threadID, messageID);
                    });
                    break;

                case "unlockname":
                    groupNameLocks.delete(threadID);
                    api.sendMessage("🔓 Group name unlocked!", threadID, messageID);
                    break;

                case "target": {
                    if (!args.length) return api.sendMessage("❌ Usage: !target <UID1> <UID2> ...", threadID, messageID);
                    const newUIDs = [];
                    for (const uid of args) {
                        if (/^\d+$/.test(uid) && !targetUIDs.includes(uid)) {
                            targetUIDs.push(uid);
                            newUIDs.push(uid);
                        }
                    }
                    writeFileSync(targetPath, targetUIDs.join("\n"));
                    if (newUIDs.length)
                        api.sendMessage(`🎯 Target(s) locked:\n${newUIDs.join("\n")}`, threadID, messageID);
                    else
                        api.sendMessage("ℹ️ No new valid UIDs provided or already added.", threadID, messageID);
                    break;
                }

                case "untarget": {
                    if (!args.length) return api.sendMessage("❌ Usage: !untarget <UID1> <UID2> ...", threadID, messageID);
                    let removed = [];
                    targetUIDs = targetUIDs.filter(uid => {
                        if (args.includes(uid)) {
                            removed.push(uid);
                            return false;
                        }
                        return true;
                    });
                    writeFileSync(targetPath, targetUIDs.join("\n"));
                    if (removed.length)
                        api.sendMessage(`🗑️ Removed target(s):\n${removed.join("\n")}`, threadID, messageID);
                    else
                        api.sendMessage("ℹ️ None of the provided UIDs were targeted.", threadID, messageID);
                    break;
                }

                case "listtargets": {
                    if (!targetUIDs.length) return api.sendMessage("📭 No UIDs are currently targeted.", threadID, messageID);
                    api.sendMessage(`🎯 Current Targets:\n${targetUIDs.join("\n")}`, threadID, messageID);
                    break;
                }

                case "help":
                    api.sendMessage(
                        `🛠 Available Commands:
• !groupnamelock
• !unlockname
• !target <uid1> <uid2> ...
• !untarget <uid1> <uid2> ...
• !listtargets
• !help`,
                        threadID, messageID
                    );
                    break;

                default:
                    api.sendMessage(`❌ Unknown command: ${command}`, threadID, messageID);
            }
            return;
        }

        // Silent group name lock
        if (type === "event" && event.logMessageType === "log:thread-name" && groupNameLocks.has(threadID)) {
            const lockedName = groupNameLocks.get(threadID);
            if (event.logMessageData?.name !== lockedName) {
                api.setTitle(lockedName, threadID);
            }
        }

        // Target UID reply handler
        if (targetUIDs.includes(senderID) && type === "message") {
            const now = Date.now();
            const lastTime = lastReplied.get(senderID) || 0;
            if (now - lastTime >= 3000) {
                lastReplied.set(senderID, now);

                if (existsSync(targetReplyPath)) {
                    const lines = readFileSync(targetReplyPath, "utf8").split("\n").filter(Boolean);
                    if (lines.length > 0) {
                        const randomReply = lines[Math.floor(Math.random() * lines.length)];
                        setTimeout(() => {
                            api.sendMessage(randomReply, threadID, messageID);
                        }, 500);
                    }
                }
            }
        }
    });
});
