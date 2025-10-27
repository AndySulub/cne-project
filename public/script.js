async function req(path, opts = {}) {
  const res = await fetch(path, opts);
  return res.json().catch(()=>({}));
}

document.getElementById('btn-status').addEventListener('click', async () => {
  const r = await req('/api/status');
  document.getElementById('status-result').textContent = JSON.stringify(r, null, 2);
});

document.getElementById('btn-login').addEventListener('click', async () => {
  const key = document.getElementById('key').value;
  const r = await fetch('/api/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ key })
  });
  const j = await r.json().catch(()=>({}));
  if (j.token) localStorage.setItem('cne_token', j.token);
  document.getElementById('login-result').textContent = JSON.stringify(j, null, 2);
});

document.getElementById('btn-admin').addEventListener('click', async () => {
  const token = localStorage.getItem('cne_token');
  const r = await fetch('/api/admin', {
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  });
  const j = await r.json().catch(()=>({}));
  document.getElementById('admin-result').textContent = JSON.stringify(j, null, 2);
});
