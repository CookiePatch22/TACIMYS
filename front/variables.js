// Defininition of all shared / cache variables
const API_URL = 'http://localhost:3000';

let allServices = [];
let currentStatusFilter = 'all';
let currentEditingServiceId = null;
let currentToken = null;
let currentUser = null;
let rulesData = [];
let groupPermissionsData = {};
let allGroups = [];
let currentEditingGroup = null;
let filteredUsers = [];
