function applyRules(rules = [], text, raw_response) {
  for (const rule of rules) {
    const pattern = rule.pattern || rule.value;
    if (!pattern) continue;

    if (rule.match_type === "regex" || rule.type === "regex") {
      const regex = new RegExp(pattern);
      if (regex.test(text)) {
        return { color: rule.color, match: pattern, raw_response };
      }
    }
  }
  return null;
}

module.exports = { applyRules } 