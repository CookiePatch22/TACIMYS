function canViewService(service, userId, userGroups) {
  if (service.owner_id === userId) return true;
  const permissions = service.group_permissions || {};
  return userGroups.some(groupName => {
    const groupPerms = permissions[groupName];
    return groupPerms && (groupPerms.includes('VIEW') || groupPerms.includes('EDIT'));
  });
}

function canEditService(service, userId, userGroups) {
  if (service.owner_id === userId) return true;
  const permissions = service.group_permissions || {};
  return userGroups.some(groupName => {
    const groupPerms = permissions[groupName];
    return groupPerms && groupPerms.includes('EDIT');
  });
}

function filterServiceData(service, userId, userGroups) {
  const isOwner = service.owner_id === userId;
  const canEdit = canEditService(service, userId, userGroups);

  if (isOwner || canEdit) {
    return service;
  }

  const { auth_config, bearer_token, password, header_value, credentials_refs, ...filtered } = service;
  return filtered;
}


module.exports = { filterServiceData, canEditService, canViewService } 