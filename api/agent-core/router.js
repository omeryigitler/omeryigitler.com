async function handleCommand(input) {
  return {
    status: "not_implemented",
    received: Boolean(input && input.text)
  };
}

module.exports = {
  handleCommand
};
