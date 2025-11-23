function showResultModal(serviceId, historyIndex) {
  const service = allServices.find((s) => s.id === serviceId);
  if (!service || !service.history[historyIndex]) return;
  const entry = service.history[historyIndex];

  const modal = document.getElementById('result-modal');
  const content = document.getElementById('result-content');
  content.innerHTML = ''; // reset

  const fields = [
    {
      label: 'Timestamp',
      value: new Date(entry.datetime).toLocaleString(),
    },
    { label: 'Match', value: entry.match },
    { label: 'Status Color', value: entry.color },
  ];

  if (entry.raw_response) {
    fields.push({
      label: 'Raw Response',
      value: JSON.stringify(entry.raw_response, null, 2),
    });
  }

  fields.forEach((f) => {
    const div = document.createElement('div');
    div.className = 'result-item';
    const lbl = document.createElement('div');
    lbl.className = 'result-label';
    lbl.textContent = f.label;
    const val = document.createElement('div');
    val.className = 'result-value';
    val.textContent = f.value;
    div.appendChild(lbl);
    div.appendChild(val);
    content.appendChild(div);
  });

  modal.classList.add('open');
}

function closeResultModal() {
  document.getElementById('result-modal').classList.remove('open');
}

function openAddModal() {
  currentEditingServiceId = null;
  document.getElementById('modal-title').textContent = 'Add New Service';
  document.getElementById('submit-btn').textContent = 'Create Service';
  document.getElementById('delete-section').style.display = 'none';

  document.getElementById('modal').reset
    ? document.getElementById('modal').querySelector('form').reset()
    : document
        .querySelectorAll('#modal input, #modal textarea, #modal select')
        .forEach((el) => {
          if (el.type === 'number') el.value = el.defaultValue || '';
          else if (el.type === 'checkbox' || el.type === 'radio')
            el.checked = el.defaultChecked;
          else el.value = '';
        });

  rulesData = [];
  renderRulesBuilder();

  groupPermissionsData = {};
  renderPermissionsBuilder();

  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  currentEditingServiceId = null;
}

async function checkAndOpenEditModal(service) {
  const user = currentUser;
  const userGroups = user?.groups || [];
  const canEdit =
    service.owner_id === currentUser.id ||
    userGroups.some((groupName) => {
      const groupPerms = (service.group_permissions || {})[groupName];
      return groupPerms && groupPerms.includes('EDIT');
    });

  if (!canEdit) {
    return;
  }
  openEditModal(service);
}

async function openEditModal(service) {
  currentEditingServiceId = service.id;
  document.getElementById('modal-title').textContent = 'Edit Service';
  document.getElementById('submit-btn').textContent = 'Update Service';
  document.getElementById('delete-section').style.display = 'block';

  try {
    const response = await fetch(`${API_URL}/services/${service.id}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch service');
    const freshService = await response.json();

    document.getElementById('name').value = freshService.name;
    document.getElementById('type').value = freshService.type;
    document.getElementById('target').value = freshService.target;
    document.getElementById('frequency').value = freshService.frequency;
    document.getElementById('history-count').value =
      freshService.history_count || 24;
    document.getElementById('max-retention').value =
      freshService.max_retention || 24;
    document.getElementById('auth-type').value = freshService.auth_type || '';

    if (freshService.request_body) {
      document.getElementById('request-body').value = freshService.request_body;
    } else {
      document.getElementById('request-body').value = '';
    }

    if (freshService.auth_type === 'bearer') {
      document.getElementById('bearer-token').value =
        freshService.bearer_token || '';
    } else if (freshService.auth_type === 'basic') {
      document.getElementById('username').value = freshService.username || '';
      document.getElementById('password').value = freshService.password || '';
    } else if (freshService.auth_type === 'header') {
      document.getElementById('header-name').value =
        freshService.header_name || '';
      document.getElementById('header-value').value =
        freshService.header_value || '';
    }

    initRulesFromExisting(JSON.stringify(freshService.rules) || '[]');
    initPermissionsFromExisting(
      JSON.stringify(freshService.group_permissions) || '{}'
    );

    updateAuthFields();
    updateRequestTypeFields();
    document.getElementById('modal').classList.add('open');
  } catch (err) {
    console.error('Failed to fetch fresh service data:', err);
    document.getElementById('modal').classList.add('open');
  }
}

function updateRequestTypeFields() {
  const type = document.getElementById('type').value;
  const requestBodyField = document.getElementById('request-body-field');
  const targetLabelType = document.getElementById('target-label-type');

  if (type === 'ping') {
    requestBodyField.style.display = 'none';
    targetLabelType.textContent = 'Hostname/IP';
  } else {
    requestBodyField.style.display = 'block';
    targetLabelType.textContent = 'URL';
  }
}

function closeModalOnOutsideClick(event) {
  const modal = event.target;
  if (modal.id === 'modal') {
    closeModal();
  } else if (modal.id === 'groups-modal') {
    closeGroupsModal();
  } else if (modal.id === 'result-modal') {
    closeResultModal();
  }
}
