async function openGroupsModal() {
  document.getElementById('groups-modal').classList.add('open');
  await loadAllGroups();
}

function closeGroupsModal() {
  document.getElementById('groups-modal').classList.remove('open');
  currentEditingGroup = null;
  document.getElementById('groups-search-input').value = '';
  document.getElementById('new-group-name').value = '';
  document.getElementById('create-group-error').textContent = '';
  document.getElementById('user-search-input').value = '';
  document.getElementById('user-search-results').innerHTML = '';
}

function switchGroupsTab(tab) {
  document.querySelectorAll('.groups-tab-content').forEach((el) => {
    el.classList.remove('active');
  });
  document.querySelectorAll('.groups-tab-btn').forEach((el) => {
    el.classList.remove('active');
  });

  if (tab === 'browse') {
    document.getElementById('groups-browse-tab').classList.add('active');
    document.querySelectorAll('.groups-tab-btn')[0].classList.add('active');
  } else if (tab === 'create') {
    document.getElementById('groups-create-tab').classList.add('active');
    document.querySelectorAll('.groups-tab-btn')[1].classList.add('active');
  } else if (tab === 'edit') {
    document.getElementById('groups-edit-tab').classList.add('active');
  }
}

async function loadAllGroups() {
  try {
    const response = await fetch(`${API_URL}/groups`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to load groups');
    allGroups = await response.json();
    renderGroupsList();
  } catch (err) {
    console.error('Error loading groups:', err);
  }
}

function renderGroupsList() {
  const container = document.getElementById('groups-list-container');
  const searchTerm = document
    .getElementById('groups-search-input')
    .value.toLowerCase();
  const filtered = allGroups.filter(
    (g) => !searchTerm || g.name.toLowerCase().includes(searchTerm)
  );

  if (filtered.length === 0) {
    container.innerHTML =
      '<div style="padding: 20px; color: #999; text-align: center;">No groups found</div>';
    return;
  }

  container.innerHTML = '';
  filtered.forEach((group) => {
    const groupCard = document.createElement('div');
    groupCard.className = 'group-card';
    groupCard.style.cssText = `
padding: 12px;
border: 1px solid #e5e5e5;
border-radius: 6px;
margin-bottom: 8px;
cursor: ${group.isOwner ? 'pointer' : 'default'};
background: #f9f9f9;
transition: all 0.2s ease;
`;

    const header = document.createElement('div');
    header.style.cssText =
      'display: flex; justify-content: space-between; align-items: center;';

    const name = document.createElement('div');
    name.style.cssText = 'font-weight: 500;';
    name.textContent = group.name;

    const badge = document.createElement('span');
    badge.style.cssText = `
font-size: 12px;
padding: 2px 8px;
border-radius: 4px;
background: ${group.isOwner ? '#dbeafe' : '#f3f4f6'};
color: ${group.isOwner ? '#0c4a6e' : '#4b5563'};
`;
    badge.textContent = group.isOwner
      ? 'Owner'
      : `${group.members.length} members`;

    header.appendChild(name);
    header.appendChild(badge);
    groupCard.appendChild(header);

    const membersInfo = document.createElement('div');
    membersInfo.style.cssText =
      'font-size: 13px; color: #666; margin-top: 8px;';
    membersInfo.textContent = `Members: ${group.members.length}`;
    groupCard.appendChild(membersInfo);

    const actionDiv = document.createElement('div');
    actionDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 12px;';

    if (group.isOwner) {
      groupCard.style.cursor = 'pointer';
      groupCard.addEventListener('mouseenter', () => {
        groupCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      });
      groupCard.addEventListener('mouseleave', () => {
        groupCard.style.boxShadow = 'none';
      });
      groupCard.onclick = () => editGroup(group);

      const isSoleMember = group.members.length === 1 && group.members[0] === currentUser.id;
      if (isSoleMember) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.style.cssText = `
    padding: 6px 12px;
    background: #ef4444;
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.2s;
  `;
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('mouseenter', () => {
          deleteBtn.style.background = '#dc2626';
        });
        deleteBtn.addEventListener('mouseleave', () => {
          deleteBtn.style.background = '#ef4444';
        });
        deleteBtn.onclick = async (e) => {
          e.stopPropagation();
          if (!confirm(`Delete group "${group.name}"? All permissions will be removed from services.`)) return;
          try {
            const response = await fetch(
              `${API_URL}/groups/${encodeURIComponent(group.name)}`,
              {
                method: 'DELETE',
                headers: getAuthHeader(),
              }
            );
            if (!response.ok) {
              const error = await response.json();
              alert(error.error || 'Failed to delete group');
              return;
            }
            await loadAllGroups();
          } catch (err) {
            console.error('Error deleting group:', err);
            alert('Failed to delete group');
          }
        };
        actionDiv.appendChild(deleteBtn);
      }
    }

    if (actionDiv.children.length > 0) {
      groupCard.appendChild(actionDiv);
    }

    container.appendChild(groupCard);
  });
}

function handleGroupsSearch() {
  renderGroupsList();
}

async function createNewGroup() {
  const name = document.getElementById('new-group-name').value.trim();
  const errorEl = document.getElementById('create-group-error');
  errorEl.textContent = '';

  if (!name) {
    errorEl.textContent = 'Group name is required';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json();
      errorEl.textContent = error.error || 'Failed to create group';
      return;
    }

    document.getElementById('new-group-name').value = '';
    await loadAllGroups();
    switchGroupsTab('browse');
  } catch (err) {
    console.error('Error creating group:', err);
    errorEl.textContent = 'Failed to create group';
  }
}

async function editGroup(group) {
  currentEditingGroup = group;
  document.getElementById('edit-group-name').textContent = group.name;
  document.getElementById('edit-group-owner').textContent = group.isOwner
    ? 'You are the owner'
    : 'You are a member';
  renderMembersList();
  switchGroupsTab('edit');
}

async function renderMembersList() {
  const container = document.getElementById('members-list');
  container.innerHTML = '';

  if (
    !currentEditingGroup.members ||
    currentEditingGroup.members.length === 0
  ) {
    container.innerHTML =
      '<div style="padding: 12px; color: #999; text-align: center;">No members yet</div>';
    return;
  }

  const memberUsernames = {};
  if (currentEditingGroup.memberDetails) {
    Object.entries(currentEditingGroup.memberDetails).forEach(([id, user]) => {
      memberUsernames[id] = user.username;
    });
  }

  currentEditingGroup.members.forEach((memberId) => {
    const memberDiv = document.createElement('div');
    memberDiv.className = 'member-item';
    memberDiv.style.cssText = `
display: flex;
justify-content: space-between;
align-items: center;
padding: 10px;
border: 1px solid #e5e5e5;
border-radius: 4px;
margin-bottom: 8px;
background: #f9f9f9;
`;

    const info = document.createElement('div');
    info.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const avatar = document.createElement('div');
    avatar.style.cssText = `
width: 32px;
height: 32px;
border-radius: 50%;
background: #dbeafe;
display: flex;
align-items: center;
justify-content: center;
font-size: 12px;
color: #0c4a6e;
font-weight: 600;
`;
    const username = memberUsernames[memberId] || 'Unknown';
    const initials = username.substring(0, 2).toUpperCase();
    avatar.textContent = initials;

    const usernameSpan = document.createElement('span');
    usernameSpan.textContent =
      memberId === currentUser.id ? `${username} (You)` : username;
    usernameSpan.style.fontSize = '14px';

    info.appendChild(avatar);
    info.appendChild(usernameSpan);
    memberDiv.appendChild(info);

    if (currentEditingGroup.isOwner && memberId !== currentUser.id) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.style.cssText = `
  padding: 4px 8px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  color: #991b1b;
  cursor: pointer;
  font-size: 12px;
`;
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => removeMember(memberId);
      memberDiv.appendChild(removeBtn);
    }

    container.appendChild(memberDiv);
  });
}

function openAddMemberForm() {
  document.getElementById('add-member-form').style.display = 'block';
}

async function handleUserSearch() {
  const query = document.getElementById('user-search-input').value.trim();
  const resultsContainer = document.getElementById('user-search-results');
  resultsContainer.innerHTML = '';

  if (!query) return;

  try {
    const response = await fetch(
      `${API_URL}/users/search?q=${encodeURIComponent(query)}`,
      {
        headers: getAuthHeader(),
      }
    );
    if (!response.ok) throw new Error('Search failed');
    const users = await response.json();

    const alreadyMembers = currentEditingGroup.members || [];
    const availableUsers = users.filter(
      (u) => !alreadyMembers.includes(u.id) && u.id !== currentUser.id
    );

    if (availableUsers.length === 0) {
      resultsContainer.innerHTML =
        '<div style="padding: 12px; color: #999; text-align: center;">No users to add</div>';
      return;
    }

    availableUsers.forEach((user) => {
      const userItem = document.createElement('div');
      userItem.style.cssText = `
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  margin-bottom: 6px;
  background: #f9f9f9;
  cursor: pointer;
  transition: all 0.2s ease;
`;
      userItem.addEventListener('mouseenter', () => {
        userItem.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
      });
      userItem.addEventListener('mouseleave', () => {
        userItem.style.boxShadow = 'none';
      });

      const username = document.createElement('span');
      username.textContent = user.username;
      username.style.fontSize = '14px';
      userItem.appendChild(username);

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.style.cssText = `
  padding: 4px 8px;
  background: #dbeafe;
  border: 1px solid #93c5fd;
  border-radius: 4px;
  color: #0c4a6e;
  cursor: pointer;
  font-size: 12px;
`;
      addBtn.textContent = 'Add';
      addBtn.onclick = () => addMember(user.id);
      userItem.appendChild(addBtn);

      resultsContainer.appendChild(userItem);
    });
  } catch (err) {
    console.error('Error searching users:', err);
  }
}

async function addMember(userId) {
  try {
    const response = await fetch(
      `${API_URL}/groups/${currentEditingGroup.name}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action: 'add', userId }),
      }
    );

    if (!response.ok) throw new Error('Failed to add member');
    const updatedGroup = await response.json();
    currentEditingGroup = updatedGroup;
    document.getElementById('user-search-input').value = '';
    document.getElementById('user-search-results').innerHTML = '';
    document.getElementById('add-member-form').style.display = 'none';
    renderMembersList();
  } catch (err) {
    console.error('Error adding member:', err);
    alert('Failed to add member');
  }
}

async function removeMember(userId) {
  if (!confirm('Remove this member from the group?')) return;

  try {
    const response = await fetch(
      `${API_URL}/groups/${currentEditingGroup.name}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action: 'remove', userId }),
      }
    );

    if (!response.ok) throw new Error('Failed to remove member');
    const updatedGroup = await response.json();
    currentEditingGroup = updatedGroup;
    renderMembersList();
  } catch (err) {
    console.error('Error removing member:', err);
    alert('Failed to remove member');
  }
}

function backToGroupsList() {
  currentEditingGroup = null;
  document.getElementById('groups-search-input').value = '';
  switchGroupsTab('browse');
  loadAllGroups();
}
