function createServiceCard(service) {
  const card = document.createElement('div');
  card.className = 'service-card';
  card.dataset.id = service.id;

  const canEdit =
    service.owner_id === currentUser.id ||
    (currentUser.groups || []).some((groupName) => {
      const groupPerms = (service.group_permissions || {})[groupName];
      return groupPerms && groupPerms.includes('EDIT');
    });
  card.dataset.editable = canEdit;

  const status = getServiceStatus(service);
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'service-status-indicator ' + status;
  const lastColor =
    service.history && service.history.length > 0
      ? service.history[service.history.length - 1].color
      : '#808080';
  statusIndicator.style.backgroundColor = lastColor;
  statusIndicator.style.color = lastColor;
  card.appendChild(statusIndicator);

  const main = document.createElement('div');
  main.className = 'service-main';
  const header = document.createElement('div');
  header.className = 'service-header';
  const name = document.createElement('div');
  name.className = 'service-name';
  name.textContent = service.name;
  const type = document.createElement('span');
  type.className = 'service-type';
  type.textContent = service.type.toUpperCase();
  header.appendChild(name);
  header.appendChild(type);

  const target = document.createElement('div');
  target.className = 'service-target';
  target.title = service.target;
  target.textContent = service.target;

  main.appendChild(header);
  main.appendChild(target);
  card.appendChild(main);

  // History
  const historyDiv = document.createElement('div');
  historyDiv.className = 'service-history';
  const displayCount = service.history_count || 24;
  const barWidth = service.bar_width || 20;
  (service.history || []).slice(-displayCount).forEach((entry, i) => {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    const dot = document.createElement('div');
    dot.className = 'history-dot';
    dot.style.backgroundColor = entry.color;
    dot.style.width = '6px';
    dot.style.height = '20px';
    dot.addEventListener('click', () => showResultModal(service.id, i));
    const tip = document.createElement('span');
    tip.className = 'tooltiptext';
    tip.textContent = `${new Date(entry.datetime).toLocaleString()}: ${
      entry.match
    }`;
    tooltip.appendChild(dot);
    tooltip.appendChild(tip);
    historyDiv.appendChild(tooltip);
  });
  card.appendChild(historyDiv);

  // Meta
  const meta = document.createElement('div');
  meta.className = 'service-meta';
  const freqSpan = document.createElement('span');
  freqSpan.textContent = service.frequency + 'min';
  const lastCheckSpan = document.createElement('span');
  lastCheckSpan.textContent = service.history?.length
    ? new Date(service.history.slice(-1)[0].datetime).toLocaleTimeString()
    : 'Never';
  meta.appendChild(freqSpan);
  meta.appendChild(lastCheckSpan);
  card.appendChild(meta);

  card.addEventListener('click', (e) => {
    if (e.target.closest('.history-dot')) return;
    checkAndOpenEditModal(service);
  });

  return card;
}

function updateServiceCard(card, service) {
  // Simple stratégie : remplacer seulement les parties dynamiques
  const status = getServiceStatus(service);
  const statusIndicator = card.querySelector('.service-status-indicator');
  statusIndicator.className = 'service-status-indicator ' + status;
  const lastColor =
    service.history && service.history.length > 0
      ? service.history[service.history.length - 1].color
      : '#808080';
  statusIndicator.style.backgroundColor = lastColor;
  statusIndicator.style.color = lastColor;
  card.querySelector('.service-name').textContent = service.name;
  card.querySelector('.service-type').textContent = service.type.toUpperCase();
  card.querySelector('.service-target').textContent = service.target;

  const historyDiv = card.querySelector('.service-history');
  historyDiv.innerHTML = ''; // small fragment replacement
  const displayCount = service.history_count || 24;
  const barWidth = service.bar_width || 20;
  (service.history || []).slice(-displayCount).forEach((entry, i) => {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    const dot = document.createElement('div');
    dot.className = 'history-dot';
    dot.style.backgroundColor = entry.color;
    dot.style.width = '6px';
    dot.style.height = '20px';
    dot.addEventListener('click', () => showResultModal(service.id, i));
    const tip = document.createElement('span');
    tip.className = 'tooltiptext';
    tip.textContent = `${new Date(entry.datetime).toLocaleString()}: ${
      entry.match
    }`;
    tooltip.appendChild(dot);
    tooltip.appendChild(tip);
    historyDiv.appendChild(tooltip);
  });

  const metaSpans = card.querySelectorAll('.service-meta span');
  metaSpans[0].textContent = service.frequency + 'min';
  metaSpans[1].textContent = service.history?.length
    ? new Date(service.history.slice(-1)[0].datetime).toLocaleTimeString()
    : 'Never';
}

// Rendu principal
function renderServices(services) {
  const container = document.getElementById('services-container');

  if (!container.dataset.initialized) {
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    services.forEach((s) => fragment.appendChild(createServiceCard(s)));
    container.appendChild(fragment);
    container.dataset.initialized = 'true';
    return;
  }

  const existingCards = new Map(
    [...container.children].map((el) => [parseInt(el.dataset.id), el])
  );
  services.forEach((service) => {
    if (existingCards.has(service.id)) {
      updateServiceCard(existingCards.get(service.id), service);
      existingCards.delete(service.id);
    } else {
      container.appendChild(createServiceCard(service));
    }
  });
  existingCards.forEach((card) => card.remove());
}
