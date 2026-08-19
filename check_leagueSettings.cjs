const admin = require('firebase-admin');
const fs = require('fs');

async function run() {
    // try to fetch from localhost API using the scriptless key
    const res = await fetch('http://127.0.0.1:3000/api/admin/sync-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': 'test' },
        body: JSON.stringify({ league: 'LLWS' })
    });
    console.log("Status:", res.status);
    console.log(await res.text());
}
run();
