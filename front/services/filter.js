function filterServices() {
  const searchTerm = document
    .getElementById('search-input')
    .value.toLowerCase();
  const filtered = allServices.filter((s) => {
    const matchesSearch =
      !searchTerm ||
      s.name.toLowerCase().includes(searchTerm) ||
      s.target.toLowerCase().includes(searchTerm) ||
      s.type.toLowerCase().includes(searchTerm);

    const matchesStatus =
      currentStatusFilter === 'all' ||
      getServiceStatus(s) === currentStatusFilter;
    return matchesSearch && matchesStatus;
  });

  renderServices(filtered);
}

function handleSearch() {
  filterServices();
}

function setStatusFilter(status) {
  currentStatusFilter = status;
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === status);
  });
  filterServices();
}
