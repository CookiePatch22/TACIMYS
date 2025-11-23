function addRuleCondition() {
  rulesData.push({ color: '#10b981', type: 'regex', value: '' });
  renderRulesBuilder();
}

function removeRuleCondition(index) {
  rulesData.splice(index, 1);
  renderRulesBuilder();
}

function updateRuleColor(index, color) {
  rulesData[index].color = color;
  updateRulesTextarea();
}

function updateRuleType(index, type) {
  rulesData[index].type = type;
  updateRulesTextarea();
}

function updateRuleValue(index, value) {
  rulesData[index].value = value;
  updateRulesTextarea();
}

function updateRulesTextarea() {
  const rulesArray = rulesData.map((r) => ({
    color: r.color,
    match_type: r.type,
    pattern: r.value,
  }));
  document.getElementById('rules').value = JSON.stringify(rulesArray);
}

function renderRulesBuilder() {
  const rulesList = document.getElementById('rules-list');
  rulesList.innerHTML = '';

  rulesData.forEach((rule, index) => {
    const conditionDiv = document.createElement('div');
    conditionDiv.className = 'rule-condition';

    const colorBtn = document.createElement('input');
    colorBtn.type = 'color';
    colorBtn.className = 'rule-color-btn';
    colorBtn.value = rule.color;
    colorBtn.title = 'Change color';

    colorBtn.onchange = (e) => updateRuleColor(index, e.target.value);

    const typeSelect = document.createElement('select');
    typeSelect.className = 'rule-type-select';
    typeSelect.value = rule.type;
    typeSelect.onchange = (e) => updateRuleType(index, e.target.value);
    typeSelect.innerHTML =
      '<option value="regex">Regex</option><option value="json">JSON</option>';

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'rule-value-input';
    valueInput.placeholder =
      rule.type === 'regex' ? 'e.g., ok|success' : 'e.g., $.status';
    valueInput.value = rule.value;
    valueInput.onchange = (e) => updateRuleValue(index, e.target.value);
    valueInput.oninput = (e) => updateRuleValue(index, e.target.value);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'rule-remove-btn';
    removeBtn.title = 'Remove condition';
    removeBtn.onclick = (e) => {
      e.preventDefault();
      removeRuleCondition(index);
    };
    removeBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    conditionDiv.appendChild(colorBtn);
    conditionDiv.appendChild(typeSelect);
    conditionDiv.appendChild(valueInput);
    conditionDiv.appendChild(removeBtn);
    rulesList.appendChild(conditionDiv);
  });
}

function initRulesFromExisting(rulesJson) {
  try {
    const parsed = JSON.parse(rulesJson);
    rulesData = parsed.map((r) => ({
      color: r.color || '#10b981',
      type: r.match_type || 'regex',
      value: r.pattern || '',
    }));
  } catch (e) {
    rulesData = [];
  }
  renderRulesBuilder();
}
