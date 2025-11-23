function renderPermissionsBuilder() {
  const permissionsList = document.getElementById('permissions-list');
  permissionsList.innerHTML = '';

  const groups = Object.keys(currentUser?.groups || []);

  if (groups.length === 0) {
    const msg = document.createElement('div');
    msg.style.padding = '12px';
    msg.style.color = '#666';
    msg.style.fontSize = '14px';
    msg.textContent = 'No groups available';
    permissionsList.appendChild(msg);
    return;
  }

  groups.forEach((groupName) => {
    const permDiv = document.createElement('div');
    permDiv.className = 'permission-group';
    permDiv.style.padding = '12px';
    permDiv.style.marginBottom = '8px';
    permDiv.style.border = '1px solid #e5e5e5';
    permDiv.style.borderRadius = '6px';
    permDiv.style.backgroundColor = '#f9f9f9';

    const groupLabel = document.createElement('div');
    groupLabel.style.fontWeight = '500';
    groupLabel.style.marginBottom = '8px';
    groupLabel.textContent = groupName;

    const checkboxesDiv = document.createElement('div');
    checkboxesDiv.style.display = 'flex';
    checkboxesDiv.style.gap = '16px';

    const viewCheckbox = document.createElement('input');
    viewCheckbox.type = 'checkbox';
    viewCheckbox.id = `view-${groupName}`;
    viewCheckbox.checked =
      groupPermissionsData[groupName] &&
      groupPermissionsData[groupName].includes('VIEW');
    viewCheckbox.onchange = () => updateGroupPermission(groupName);

    const viewLabel = document.createElement('label');
    viewLabel.htmlFor = `view-${groupName}`;
    viewLabel.style.cursor = 'pointer';
    viewLabel.style.display = 'flex';
    viewLabel.style.alignItems = 'center';
    viewLabel.style.gap = '6px';
    viewLabel.innerHTML =
      '<span style="font-size: 14px;">VIEW (see results)</span>';

    const editCheckbox = document.createElement('input');
    editCheckbox.type = 'checkbox';
    editCheckbox.id = `edit-${groupName}`;
    editCheckbox.checked =
      groupPermissionsData[groupName] &&
      groupPermissionsData[groupName].includes('EDIT');
    editCheckbox.onchange = () => updateGroupPermission(groupName);

    const editLabel = document.createElement('label');
    editLabel.htmlFor = `edit-${groupName}`;
    editLabel.style.cursor = 'pointer';
    editLabel.style.display = 'flex';
    editLabel.style.alignItems = 'center';
    editLabel.style.gap = '6px';
    editLabel.innerHTML =
      '<span style="font-size: 14px;">EDIT (modify settings)</span>';

    checkboxesDiv.appendChild(viewCheckbox);
    checkboxesDiv.appendChild(viewLabel);
    checkboxesDiv.appendChild(editCheckbox);
    checkboxesDiv.appendChild(editLabel);

    permDiv.appendChild(groupLabel);
    permDiv.appendChild(checkboxesDiv);
    permissionsList.appendChild(permDiv);
  });
}

function updateGroupPermission(groupName) {
  const perms = [];
  if (document.getElementById(`view-${groupName}`)?.checked) perms.push('VIEW');
  if (document.getElementById(`edit-${groupName}`)?.checked) perms.push('EDIT');

  if (perms.length > 0) {
    groupPermissionsData[groupName] = perms;
  } else {
    delete groupPermissionsData[groupName];
  }

  document.getElementById('group-permissions').value =
    JSON.stringify(groupPermissionsData);
}

function initPermissionsFromExisting(permissionsJson) {
  try {
    groupPermissionsData = JSON.parse(permissionsJson || '{}');
  } catch (e) {
    groupPermissionsData = {};
  }
  renderPermissionsBuilder();
}

async function renderPermissionsBuilder() {
  const permissionsList = document.getElementById('permissions-list');
  const searchResults = document.getElementById('permissions-search-results');
  const searchInput = document.getElementById('permissions-group-search');

  permissionsList.innerHTML = '';
  searchResults.innerHTML = '';
  searchInput.value = '';

  try {
    const response = await fetch(`${API_URL}/groups`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch groups');
    const allGroups = await response.json();

    if (allGroups.length === 0) {
      const msg = document.createElement('div');
      msg.style.padding = '12px';
      msg.style.color = '#666';
      msg.style.fontSize = '14px';
      msg.textContent =
        'No groups available. Create one in the Groups Manager.';
      permissionsList.appendChild(msg);
      return;
    }

    const inputHandler = (e) => {
      const term = e.target.value.toLowerCase();
      if (!term) {
        searchResults.style.display = 'none';
        return;
      }

      const matching = allGroups.filter(
        (g) =>
          g.name.toLowerCase().includes(term) && !groupPermissionsData[g.name]
      );

      searchResults.innerHTML = '';
      if (matching.length === 0) {
        searchResults.style.display = 'none';
        return;
      }

      searchResults.style.display = 'block';
      matching.forEach((group) => {
        const resultItem = document.createElement('div');
        resultItem.style.cssText = `
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    transition: background 0.2s;
  `;
        resultItem.textContent = group.name;
        resultItem.addEventListener('mouseenter', () => {
          resultItem.style.background = '#f5f5f5';
        });
        resultItem.addEventListener('mouseleave', () => {
          resultItem.style.background = 'transparent';
        });
        resultItem.addEventListener('click', () => {
          groupPermissionsData[group.name] = [];
          searchInput.value = '';
          searchResults.style.display = 'none';
          renderPermissionsBuilder();
        });
        searchResults.appendChild(resultItem);
      });
    };

    searchInput.removeEventListener('input', searchInput._inputHandler);
    searchInput._inputHandler = inputHandler;
    searchInput.addEventListener('input', inputHandler);

    Object.keys(groupPermissionsData).forEach((groupName) => {
      const group = allGroups.find((g) => g.name === groupName);
      if (!group) return;

      const permDiv = document.createElement('div');
      permDiv.className = 'permission-group';
      permDiv.dataset.groupName = group.name;
      permDiv.style.padding = '12px';
      permDiv.style.marginBottom = '8px';
      permDiv.style.border = '1px solid #e5e5e5';
      permDiv.style.borderRadius = '6px';
      permDiv.style.backgroundColor = '#f9f9f9';

      const groupLabelHeader = document.createElement('div');
      groupLabelHeader.style.cssText =
        'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';

      const groupLabel = document.createElement('div');
      groupLabel.style.fontWeight = '500';
      groupLabel.textContent = group.name;
      if (group.isOwner) {
        const ownerBadge = document.createElement('span');
        ownerBadge.style.cssText =
          'margin-left: 8px; font-size: 11px; padding: 2px 6px; background: #dbeafe; color: #0c4a6e; border-radius: 3px; font-weight: 400;';
        ownerBadge.textContent = 'Owner';
        groupLabel.appendChild(ownerBadge);
      }

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.style.cssText = `
  padding: 4px 8px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 3px;
  color: #991b1b;
  cursor: pointer;
  font-size: 12px;
`;
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => {
        delete groupPermissionsData[groupName];
        updateGroupPermission(groupName);
        renderPermissionsBuilder();
      };

      groupLabelHeader.appendChild(groupLabel);
      groupLabelHeader.appendChild(removeBtn);

      const checkboxesDiv = document.createElement('div');
      checkboxesDiv.style.display = 'flex';
      checkboxesDiv.style.gap = '16px';

      const viewCheckbox = document.createElement('input');
      viewCheckbox.type = 'checkbox';
      viewCheckbox.id = `view-${group.name}`;
      viewCheckbox.checked =
        groupPermissionsData[group.name] &&
        groupPermissionsData[group.name].includes('VIEW');
      viewCheckbox.onchange = () => updateGroupPermission(group.name);

      const viewLabel = document.createElement('label');
      viewLabel.htmlFor = `view-${group.name}`;
      viewLabel.style.cursor = 'pointer';
      viewLabel.style.display = 'flex';
      viewLabel.style.alignItems = 'center';
      viewLabel.style.gap = '6px';
      viewLabel.innerHTML =
        '<span style="font-size: 14px;">VIEW (see results)</span>';

      const editCheckbox = document.createElement('input');
      editCheckbox.type = 'checkbox';
      editCheckbox.id = `edit-${group.name}`;
      editCheckbox.checked =
        groupPermissionsData[group.name] &&
        groupPermissionsData[group.name].includes('EDIT');
      editCheckbox.onchange = () => updateGroupPermission(group.name);

      const editLabel = document.createElement('label');
      editLabel.htmlFor = `edit-${group.name}`;
      editLabel.style.cursor = 'pointer';
      editLabel.style.display = 'flex';
      editLabel.style.alignItems = 'center';
      editLabel.style.gap = '6px';
      editLabel.innerHTML =
        '<span style="font-size: 14px;">EDIT (modify settings)</span>';

      checkboxesDiv.appendChild(viewCheckbox);
      checkboxesDiv.appendChild(viewLabel);
      checkboxesDiv.appendChild(editCheckbox);
      checkboxesDiv.appendChild(editLabel);

      permDiv.appendChild(groupLabelHeader);
      permDiv.appendChild(checkboxesDiv);
      permissionsList.appendChild(permDiv);
    });
  } catch (err) {
    console.error('Error loading groups for permissions:', err);
  }
}
