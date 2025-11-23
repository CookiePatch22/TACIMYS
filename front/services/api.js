function getServiceStatus(service) {
  if (!service.history || service.history.length === 0) return 'unknown';
  const lastEntry = service.history[service.history.length - 1];
  if (['#00ff00', '#10b981'].includes(lastEntry.color.toLowerCase()))
    return 'online';
  if (['#ff0000', '#ef4444'].includes(lastEntry.color.toLowerCase()))
    return 'offline';
  return 'unknown';
}

function deleteService(serviceId) {
  if (!confirm('Are you sure you want to delete this service?')) return;

  fetch(`${API_URL}/services/${serviceId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  })
    .then((res) => res.json())
    .then((data) => {
      closeModal();
      loadServices();
    })
    .catch((err) => {
      console.error('Error:', err);
      alert('Error deleting service');
    });
}

function handleSubmit(event) {
  event.preventDefault();

  const rules = rulesData.map((r) => ({
    color: r.color,
    match_type: r.type,
    pattern: r.value,
  }));

  const formData = {
    name: document.getElementById('name').value,
    type: document.getElementById('type').value,
    target: document.getElementById('target').value,
    frequency: parseInt(document.getElementById('frequency').value),
    history_count: parseInt(document.getElementById('history-count').value),
    max_retention: parseInt(document.getElementById('max-retention').value),
    auth_type: document.getElementById('auth-type').value,
    rules: rules,
    group_permissions: groupPermissionsData,
  };

  if (formData.type !== 'ping') {
    formData.request_body = document.getElementById('request-body').value;
  }

  if (formData.auth_type === 'bearer') {
    formData.bearer_token = document.getElementById('bearer-token').value;
  } else if (formData.auth_type === 'basic') {
    formData.username = document.getElementById('username').value;
    formData.password = document.getElementById('password').value;
  } else if (formData.auth_type === 'header') {
    formData.header_name = document.getElementById('header-name').value;
    formData.header_value = document.getElementById('header-value').value;
  }

  const url = currentEditingServiceId
    ? `${API_URL}/services/${currentEditingServiceId}`
    : `${API_URL}/services`;

  const method = currentEditingServiceId ? 'PUT' : 'POST';

  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(formData),
  })
    .then((res) => res.json())
    .then((data) => {
      closeModal();
      loadServices();
    })
    .catch((err) => {
      console.error('Error:', err);
      alert('Error saving service');
    });
}

async function loadServices() {
  try {
    const response = await fetch(`${API_URL}/services`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      throw new Error('Failed to fetch services');
    }

    const services = await response.json();

    // Fetch history for each service
    allServices = await Promise.all(
      services.map(async (service) => {
        try {
          const historyResponse = await fetch(
            `${API_URL}/services/${service.id}/history`,
            {
              headers: getAuthHeader(),
            }
          );
          const history = await historyResponse.json();
          return { ...service, history };
        } catch (err) {
          console.error(
            `Failed to load history for service ${service.id}:`,
            err
          );
          return { ...service, history: [] };
        }
      })
    );

    filterServices();
  } catch (err) {
    console.error('Failed to load services:', err);
  }
}
