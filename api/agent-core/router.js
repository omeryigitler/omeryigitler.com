const { db } = require("../_firebaseAdmin");
const { getLatestLeadMessage } = require("./tools/messages");

async function handleCommand(input) {
  const latestMessage = await getLatestLeadMessage(db);
  return {
    status: latestMessage ? "message_found" : "empty",
    received: Boolean(input && input.text),
    message: latestMessage
  };
}

module.exports = {
  handleCommand
};
