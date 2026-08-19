async function run() {
    const res = await fetch('http://127.0.0.1:3000/api/admin/sync-schedules', { method: 'POST', headers: {'Content-Type': 'application/json'} });
    const text = await res.text();
    console.log("Response:", res.status, text);
}
run();
