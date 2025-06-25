// 🔧 Required modules
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
    fileLoops: {},
    mkcIntervals: {},
    mkcIndexes: {},
    groupNameLocks: {},
    fpicInterval: {},
    autoResponds: [
        {
            triggers: ["mayank gandu", "mayank lodu", "mayank jhaatu", "m9ynk g9ndu", "maynk gandu", "mayan gandu"],
            reply: "teri ma ka bhosda mayank baap hai tera smjha madrchod 😒"
        },
        {
            triggers: ["mayank madrchod", "mayank teri ma ki chut"],
            reply: "ban gya hoshiyar apne pita ji ko gali deke bol ab teri ma chod du idhar bhen ke lode😏"
        },
        {
            triggers: ["mayank gand", "mayank randi ke bache"],
            reply: "teri ma ki chut faar dunga sale baap ko gali deta hai madrchod ki nsaal🩵"
        },
        {
            triggers: ["mayank mkc", "mayank rkb"],
            reply: "rand ke bete dediya mayank jaise axhe bache ko gali use gali ni dene ata to tu hoshiyar ban rahaa madrchod😒😒"
        },
        {
            triggers: ["mayank sale", "mayank bhsdk", "mayank randi", "mayank lodu"],
            reply: "tu kitni bhi koshis kr lekin teri maaa mai nahi chodunga mayank chodega 😎"
        },
        {
            triggers: ["mayank lode", "mayank chutiya", "mayank bkl"],
            reply: "mayank bhay is bkl ko pel du aap bolo to bahut uchal raha mc😠"
        }
    ],
    ownerAutoResponds: [
        {
            triggers: ["Sena pati", "status pls", "status?"],
            reply: "Bolo maharaj kiss ma ke lode ki ma chudne ko tadap rahi hai naam batao abhi chod dunga sale ko🙋🏻😎"
        },
        {
            triggers: ["koi apna nahi hai", "bot off"],
            reply: "sahi kaha sir sab matlabi hai fb pe kisi pe bharosa nahi kar sakte hai ❤️‍🩹💔😅"
        }
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
            const matched = triggers.some(trigger => {
                const tWords = trigger.toLowerCase().split(/\s+/);
                const bWords = lowerBody.split(/\s+/);
                return tWords.every(tw =>
                    bWords.some(bw => stringSimilarity.compareTwoStrings(tw, bw) > 0.5)
                );
            });
            if (matched) return api.sendMessage(reply, threadID, messageID);
        }

        // 👑 Owner-only AutoResponder
        if (OWNER_UIDS.includes(senderID)) {
            for (const { triggers, reply } of global.data.ownerAutoResponds) {
                const matched = triggers.some(trigger => {
                    const tWords = trigger.toLowerCase().split(/\s+/);
                    const bWords = lowerBody.split(/\s+/);
                    return tWords.every(tw =>
                        bWords.some(bw => stringSimilarity.compareTwoStrings(tw, bw) > 0.5)
                    );
                });
                if (matched) return api.sendMessage(reply, threadID, messageID);
            }
        }

        if (global.data.npUIDs.includes(senderID)) {
            try {
                const lines = readFileSync("np.txt", "utf-8").split(/\r?\n/).filter(x => x.trim());
                const random = lines[Math.floor(Math.random() * lines.length)];
                if (random) return api.sendMessage(random, threadID, messageID);
            } catch { }
        }

        if (!body.startsWith("!")) return;
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
• !loopmsg <msg>
• !stoploop
• !npadd <uid>
• !npremove <uid>
• !nplist
• !groupnamelock <name|off>
• !nickall <nickname>
• !mkc <prefix> | <seconds>
• !stopmkc
• !loopfile <filename> – Send lines from file every 15 sec
• !stopfile – Stop the current file loop
• !fpic (reply to photo)
• !stopfpic
• !uid
• !guid
• !exit`, threadID, messageID);

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

            case "npadd":
                const addUID = args[0];
                if (!addUID) return api.sendMessage("❌ Usage: !npadd <uid>", threadID, messageID);
                if (!global.data.npUIDs.includes(addUID)) {
                    global.data.npUIDs.push(addUID);
                    return api.sendMessage(`✅ UID ${addUID} added to NP list.`, threadID, messageID);
                }
                return api.sendMessage("⚠️ UID already in NP list.", threadID, messageID);

            case "npremove":
                const removeUID = args[0];
                if (!removeUID) return api.sendMessage("❌ Usage: !npremove <uid>", threadID, messageID);
                global.data.npUIDs = global.data.npUIDs.filter(u => u !== removeUID);
                return api.sendMessage(`✅ UID ${removeUID} removed from NP list.`, threadID, messageID);

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
                return api.sendMessage(`🔒 Group name locked to: ${name}`, threadID, messageID);
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

                api.sendMessage(`🔁 MKC started with prefix "${prefix}". Use !stopmkc to stop.`, threadID);
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

            case "fpic": {
                if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0)
                    return api.sendMessage("❌ Please reply to a photo to use !fpic", threadID, messageID);

                const attachment = event.messageReply.attachments[0];
                if (attachment.type !== "photo")
                    return api.sendMessage("❌ Only photo attachments are supported.", threadID, messageID);

                if (global.data.fpicInterval?.[threadID])
                    return api.sendMessage("⚠️ fpic is already running! Use !stopfpic to stop.", threadID, messageID);

                api.sendMessage("🔁 fpic started. Use !stopfpic to stop.", threadID);

                global.data.fpicInterval[threadID] = setInterval(() => {
                    api.sendMessage({
                        body: "",
                        attachment: api.getStreamFromURL(attachment.url)
                    }, threadID);
                }, 15000);
                break;
            }

            case "stopfpic":
                if (!global.data.fpicInterval?.[threadID])
                    return api.sendMessage("⚠️ fpic is not running.", threadID, messageID);
                clearInterval(global.data.fpicInterval[threadID]);
                delete global.data.fpicInterval[threadID];
                return api.sendMessage("🛑 fpic stopped.", threadID, messageID);

            case "uid": {
                let targetUID;

                if (event.messageReply) {
                    targetUID = event.messageReply.senderID;
                    return api.sendMessage(`🆔 UID of replied user: ${targetUID}`, threadID, messageID);
                }

                if (event.mentions && Object.keys(event.mentions).length > 0) {
                    const mentionedUID = Object.keys(event.mentions)[0];
                    return api.sendMessage(`🆔 UID of mentioned user: ${mentionedUID}`, threadID, messageID);
                }

                return api.sendMessage(`🆔 Your UID: ${senderID}`, threadID, messageID);
            }

            case "guid":
                return api.sendMessage(`🆔 Group UID: ${threadID}`, threadID, messageID);
               
                 // ✅ !loopfile <filename>
        case "loopfile": {
            const filename = args[0];
            if (!filename) return api.sendMessage("⚠️ File ka naam do, jaise: !loopfile mayank.txt", threadID);
            const fs = require("fs");

            if (!fs.existsSync(filename)) return api.sendMessage(`❌ File '${filename}' nahi mili.`, threadID);

            if (global.data.fileLoops?.[threadID]) {
                return api.sendMessage("⚠️ File loop already chal raha hai is group me. Pehle !stopfile bhejo.", threadID);
            }

            const lines = fs.readFileSync(filename, "utf-8").split(/\r?\n/).filter(Boolean);
            if (!lines.length) return api.sendMessage("❌ File khali hai.", threadID);

            let index = 0;
            const interval = setInterval(() => {
                if (!global.data.fileLoops?.[threadID]) return; // Loop stopped

                api.sendMessage(lines[index], threadID);
                index = (index + 1) % lines.length;
            }, 5000); // 5 sec delay

            global.data.fileLoops[threadID] = interval;
            api.sendMessage(`🔁 '${filename}' ka loop start ho gaya. !stopfile likh ke band karo.`, threadID);
        }

        // ✅ !stopfile
        case "stopfile": {
            if (global.data.fileLoops?.[threadID]) {
                clearInterval(global.data.fileLoops[threadID]);
                delete global.data.fileLoops[threadID];
                api.sendMessage("⛔ File loop band ho gaya.", threadID);
            } else {
                api.sendMessage("⚠️ Koi file loop chalu nahi hai.", threadID);
            }
        }

            case "exit":
                api.sendMessage("👋 Bye mayank bhay jara hun kisi or ki ma chodni ho to dubara add krdena 🙈.", threadID, () => {
                    api.leaveGroup(threadID);
                });
                break;

            default:
                return api.sendMessage(`❌ Unknown command: ${command}`, threadID, messageID);
        }
    });
});
