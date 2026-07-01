const ACTION_POLICY = {
  read_latest_message: {
    risk: "low",
    approvalRequired: false
  },
  summarize_messages: {
    risk: "low",
    approvalRequired: false
  },
  propose_quote: {
    risk: "medium",
    approvalRequired: false
  },
  create_quote: {
    risk: "medium",
    approvalRequired: true
  },
  update_project_note: {
    risk: "medium",
    approvalRequired: true
  }
};

function getActionPolicy(action) {
  return ACTION_POLICY[action] || {
    risk: "medium",
    approvalRequired: true
  };
}

module.exports = {
  ACTION_POLICY,
  getActionPolicy
};
