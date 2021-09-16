require("dotenv").config();

const sdk = require("matrix-js-sdk");
const { logger: mxLogger, logger } = require("matrix-js-sdk/lib/logger");
const { EventEmitter } = require("events");

/*
    For some reason it logs debug
    messages by default. 

    This disables that
*/
function rewriteMatrixLogger() {
  // rewrite matrix logger
  mxLogger.info = (...msg) =>
    logger.log({ level: "info", message: msg.join(" ") });
  mxLogger.log = (...msg) =>
    logger.log({ level: "info", message: msg.join(" ") });
  mxLogger.warn = (...msg) =>
    logger.log({ level: "warn", message: msg.join(" ") });
  mxLogger.error = (...msg) =>
    logger.log({ level: "error", message: msg.join(" ") });
  mxLogger.trace = (...msg) =>
    logger.log({ level: "debug", message: msg.join(" ") });

  // dont log debug ones
  logger.setLevel("error");
}
rewriteMatrixLogger();

const { USER_ID, ACCESS_TOKEN } = process.env;

const matrixClient = sdk.createClient({
  baseUrl: "https://matrix.org",
  accessToken: ACCESS_TOKEN,
  userId: USER_ID,
});

// const room = rooms.chunk.find((a) => a?.canonical_alias === canonicalAlias);

async function startAndSync() {
  await matrixClient.startClient({ initialSyncLimit: 10 });

  return new Promise((resolve, reject) => {
    matrixClient.once("sync", (state) => {
      if (state === "PREPARED") {
        resolve();
      } else {
        console.error(state);
        reject();
      }
    });
  });
}

async function getMessagesFromRoom(canonicalAlias, callback) {
  matrixClient.on("Room.timeline", (event, messageRoom, toStartOfTimeline) => {
    // don't print paginated results
    if (toStartOfTimeline) {
      return;
    }

    // not the room we selected
    if (messageRoom?.canonical_alias === canonicalAlias) {
      return;
    }

    // only use messages
    if (event.getType() !== "m.room.message") {
      return;
    }

    callback(event);
  });
}

export default async function main(roomName) {
  const eventEmitter = new EventEmitter();

  try {
    await startAndSync();
  } catch (e) {
    console.error("Couldnt sync");
    process.exit(1);
  }

  console.info("Listening for messages...");

  getMessagesFromRoom(roomName, (event) => {
    console.log("event", event);
    eventEmitter;
  });

  return Object.assign(eventEmitter, {
    // .. return more things
  });
}

main("#altair:matrix.org");
