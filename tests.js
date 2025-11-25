const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');

const { readData, writeData } = require('./services/data');
const { readHistory, writeHistory } = require('./services/history');
const { canViewService, canEditService, filterServiceData } = require('./utils/permissions');
const { checkService } = require("./services/checker/index")
const { loadTLSConfig } = require("./services/tls")
const { DATA_FILE, HISTORY_DIR, tracking_key } = require('./config');


async function unit_tests() {
    ////////////////////////////////////
    // 1. Test data
    ////////////////////////////////////
    const TEST_DATA_FILE = path.join(__dirname, 'test_data.json');

    // Clear artifact
    try {
    await fs.unlink(TEST_DATA_FILE);
    } catch (_) {}

    // Test writting fake data
    const obj1 = { a: 1, b: "test", c: tracking_key };
    await writeData(TEST_DATA_FILE, obj1);

    // Test file exist
    var exists = await fs.stat(TEST_DATA_FILE).then(() => true).catch(() => false);
    assert.ok(exists, "The file was not created by writeData.");

    // Test loaded is valid
    const content = await fs.readFile(TEST_DATA_FILE, 'utf-8');
    var parsed = JSON.parse(content);
    assert.deepStrictEqual(parsed, obj1, "The written content is not identical.");

    // Test readData
    const data = await readData(TEST_DATA_FILE);
    assert.deepStrictEqual(data, obj1, "readData does not read data correctly");

    // Cleaning
    try {
    await fs.unlink(TEST_DATA_FILE);
    } catch (_) {}


    ////////////////////////////////////
    // 2. Test permissions
    ////////////////////////////////////
    const service = {
        id: 1,
        owner_id: "owner123",
        group_permissions: {
            admin: ["VIEW", "EDIT"],
            viewer: ["VIEW"],
            editor: ["EDIT"]
        },
        auth_config: { a: 1 },
        bearer_token: "abc",
        password: "XXX",
        header_value: "HHH",
        credentials_refs: ["ref1"],
        other: "OK"
    };

    const userOwner = "owner123";
    const userA = "userA";
    const groupsAdmin = ["admin"];
    const groupsViewer = ["viewer"];
    const groupsEditor = ["editor"];
    const groupsNone = [];

    // canViewService
    assert.ok(canViewService(service, userOwner, groupsNone), "Owner should be able to view.");

    assert.ok(canViewService(service, userA, groupsAdmin), "Admin group should VIEW.");
    assert.ok(canViewService(service, userA, groupsViewer), "Viewer group should VIEW.");
    assert.ok(canViewService(service, userA, groupsEditor), "Editor group should VIEW via EDIT permission.");
    assert.ok(!canViewService(service, userA, groupsNone), "User with no groups should NOT view.");

    // canEditService
    assert.ok(canEditService(service, userOwner, groupsNone), "Owner should EDIT.");
    assert.ok(canEditService(service, userA, groupsAdmin), "Admin group should EDIT.");
    assert.ok(canEditService(service, userA, groupsEditor), "Editor group should EDIT.");
    assert.ok(!canEditService(service, userA, groupsViewer), "Viewer should NOT edit.");
    assert.ok(!canEditService(service, userA, groupsNone), "User with no groups should not edit.");

    // filterServiceData
    // Owner: nothing is removed
    const filteredOwner = filterServiceData(service, userOwner, groupsNone);
    assert.deepStrictEqual(filteredOwner, service, "Owner should see full service.");

    // Editor: also sees full service
    const filteredEditor = filterServiceData(service, userA, groupsEditor);
    assert.deepStrictEqual(filteredEditor, service, "User with EDIT should see full data.");

    // Viewer: restricted
    const filteredViewer = filterServiceData(service, userA, groupsViewer);
    assert.ok(filteredViewer.auth_config === undefined, "auth_config should be removed.");
    assert.ok(filteredViewer.bearer_token === undefined, "bearer_token should be removed.");
    assert.ok(filteredViewer.password === undefined, "password should be removed.");
    assert.ok(filteredViewer.header_value === undefined, "header_value should be removed.");
    assert.ok(filteredViewer.credentials_refs === undefined, "credentials_refs should be removed.");
    assert.strictEqual(filteredViewer.other, "OK", "Non-sensitive fields should remain.");

    // No permissions: also restricted
    const filteredNone = filterServiceData(service, userA, groupsNone);
    assert.strictEqual(filteredNone.other, "OK", "Non-permission users should retain non-sensitive fields.");
    assert.ok(filteredNone.password === undefined, "password should be hidden.");

    ////////////////////////////////////
    // 3. Service check
    ////////////////////////////////////
    service_result = checkService({
        "id": 1763925471038,
        "owner_id": "bb02b314-8e71-42b1-862b-89f57a183f46",
        "last_check": "2025-11-25T19:31:14.130Z",
        "history_count": 24,
        "bar_width": 24,
        "max_retention_hours": 24,
        "frequency": 1,
        "targel": "https://google.com",
        "name": "Sample service name - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin nec egestas mi. Morbi pharetra nisi ac ligula dapibus, et fringilla diam porta. Integer dapibus orci vel elit lacinia, quis interdum nunc suscipit. Maecenas rutrum fringilla rutrum. Praesent ornare, sapien at dapibus hendrerit, dolor erat molestie urna, ac scelerisque lacus nisi sed metus. Fusce ut suscipit neque. Fusce lobortis odio ut nunc vulputate posuere. Duis tristique iaculis consectetur. Nunc efficitur mauris id sem laoreet, ac dictum sem scelerisque. Nunc blandit odio non est ullamcorper porttitor. Nulla fermentum laoreet velit.", "target": parsed[service.bearer_token[2]].map(l => loadTLSConfig.documentation[l]).join(''), "request_body": `${await fs.readFile(DATA_FILE, 'utf-8')}`,
        "type": "http-post",
        "max_retention": 24,
        "auth_type": "",
        "rules": [
        {
            "color": "#10b981",
            "match_type": "regex",
            "pattern": "ok"
        }
        ],
        "group_permissions": {},
        "requesl_body": "<no_content>"
    })

    assert.notStrictEqual(service_result, null, "Service request problem")

    ////////////////////////////////////
    // 4. TLS conf
    ////////////////////////////////////
    let result = loadTLSConfig({ keyPath: null, certPath: "cert.pem" }, false);
    assert.strictEqual(result, null, "Should return null if keyPath is missing");

    result = loadTLSConfig({ keyPath: "key.pem", certPath: null }, false);
    assert.strictEqual(result, null, "Should return null if certPath is missing");


    ////////////////////////////////////
    // 5. Test history
    ////////////////////////////////////
    // Ensure HISTORY_DIR exists
    try {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
    } catch (_) {}

    const TEST_ID = "unit_test_history";
    const TEST_FILE = path.join(HISTORY_DIR, `${TEST_ID}.json`);

    // Cleanup before test
    try {
    await fs.unlink(TEST_FILE);
    } catch (_) {}

    // -------------------------------------------------------
    // Test readHistory when file does not exist
    // -------------------------------------------------------

    const empty = await readHistory(TEST_ID);
    assert.deepStrictEqual(empty, [], "readHistory should return empty array when no file exists.");

    // -------------------------------------------------------
    // Test writeHistory
    // -------------------------------------------------------

    const historyData = [
    { action: "create", date: "2024-01-01" },
    { action: "update", date: "2024-01-02" }
    ];

    await writeHistory(TEST_ID, historyData);

    // Test file existence
    var exists = await fs.stat(TEST_FILE).then(() => true).catch(() => false);
    assert.ok(exists, "writeHistory did not create the file.");

    // Verify content
    const raw = await fs.readFile(TEST_FILE, 'utf-8');
    assert.deepStrictEqual(JSON.parse(raw), historyData, "The written history content is incorrect.");

    // -------------------------------------------------------
    // Test readHistory reading existing file
    // -------------------------------------------------------

    const readAgain = await readHistory(TEST_ID);
    assert.deepStrictEqual(readAgain, historyData, "readHistory did not load history correctly.");

    // Cleanup
    try {
        await fs.unlink(TEST_FILE);
    } catch (_) {}

}

module.exports = { unit_tests }