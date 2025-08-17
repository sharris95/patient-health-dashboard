const API_URL   = 'https://fedskillstest.coalitiontechnologies.workers.dev';
const ASSETS_DIR = './assets';

/* ------------ fetch + helpers ------------ */
async function fetchPatients() {
  const token = btoa('coalition:skills-test');
  const res = await fetch(API_URL, {
    headers: { Authorization: `Basic ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function fmtDOB(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
function monthIndex(m) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return months.findIndex(x => x.toLowerCase() === String(m || '').toLowerCase());
}
function lastSix(list = []) {
  const sorted = list.slice().sort((a,b) => (a.year - b.year) || (monthIndex(a.month) - monthIndex(b.month)));
  return sorted.slice(-6);
}
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/* ------------ roster ------------ */
function renderRoster(patients, current='Jessica Taylor'){
  const ul = document.getElementById('roster');
  if (!ul) return;
  ul.innerHTML = patients.map(p => `
    <li class="pat ${p.name===current ? 'active' : ''}">
      <img class="av" src="${p.profile_picture || ''}" alt="">
      <div>
        <div class="nm">${p.name}</div>
        <div class="meta">${p.gender}, ${p.age}</div>
      </div>
      <div style="margin-left:auto;opacity:.5">⋯</div>
    </li>
  `).join('');
}

/* ------------ vitals ------------ */
function renderVitals(latest) {
  const root = document.getElementById('vitals3');
  if (!root) return;

  const cards = [
    { cls:'resp', icon:`${ASSETS_DIR}/respiratory_rate.svg`, label:'Respiratory Rate',
      val: latest?.respiratory_rate?.value != null ? `${latest.respiratory_rate.value} bpm` : '—',
      note: latest?.respiratory_rate?.levels || '' },
    { cls:'temp', icon:`${ASSETS_DIR}/temperature.svg`, label:'Temperature',
      val: latest?.temperature?.value != null ? `${latest.temperature.value}°F` : '—',
      note: latest?.temperature?.levels || '' },
    { cls:'hr', icon:`${ASSETS_DIR}/HeartBPM.svg`, label:'Heart Rate',
      val: latest?.heart_rate?.value != null ? `${latest.heart_rate.value} bpm` : '—',
      note: latest?.heart_rate?.levels || '' },
  ];

  root.innerHTML = cards.map(c => `
    <div class="v3 ${c.cls}">
      <div class="icon-badge"><img src="${c.icon}" alt=""></div>
      <div>
        <div class="k">${c.label}</div>
        <div class="v">${c.val}</div>
        <div class="note">${c.note}</div>
      </div>
    </div>
  `).join('');
}

/* ------------ chart (fixed) ------------ */
function renderChart(items) {
  // labels like "Oct. 23", values as numbers
  const labels    = items.map(i => `${(i.month || '').slice(0,3)}. ${String(i.year).slice(-2)}`);
  const systolic  = items.map(i => Number(i?.blood_pressure?.systolic?.value) || null);
  const diastolic = items.map(i => Number(i?.blood_pressure?.diastolic?.value) || null);

  // y-scale from data
  const vals = [...systolic, ...diastolic].filter(v => v != null);
  const yMin = Math.max(50, Math.floor((Math.min(...vals) - 10) / 10) * 10);
  const yMax = Math.min(220, Math.ceil((Math.max(...vals) + 10) / 10) * 10);

  // 2D context + clear old instance
  const canvas = document.getElementById('bpChart');
  const ctx = canvas.getContext('2d');
  if (window._bpChart) window._bpChart.destroy();

  const sys = cssVar('--sys', '#c084fc');
  const dia = cssVar('--dia', '#60a5fa');
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;

  window._bpChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Systolic',
          data: systolic,
          borderColor: sys,
          backgroundColor: sys,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: sys,
          pointBorderWidth: 2,
          segment: { borderJoinStyle: 'round', borderCapStyle: 'round' },
          tension: 0.35,
          spanGaps: true,
          fill: false
        },
        {
          label: 'Diastolic',
          data: diastolic,
          borderColor: dia,
          backgroundColor: dia,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: dia,
          pointBorderWidth: 2,
          segment: { borderJoinStyle: 'round', borderCapStyle: 'round' },
          tension: 0.35,
          spanGaps: true,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // let Chart.js parse number arrays normally
      normalized: true,
      animation: { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 48, right: 10, bottom: 6, left: 10 } },
      elements: { point: { hitRadius: 12 } },
      devicePixelRatio: Math.min(dpr, 1.75),
      scales: {
        y: { min: yMin, max: yMax, ticks: { stepSize: 20, color: '#475569' }, grid: { color: '#ede9fe' } },
        x: { ticks: { color: '#475569' }, grid: { color: '#f3f4f6' } },
      },
      plugins: { legend: { display: false } }
    }
  });

  // Update small stats next to legend
  const last = items[items.length - 1] || {};
  const sVal  = last?.blood_pressure?.systolic?.value ?? '—';
  const dVal  = last?.blood_pressure?.diastolic?.value ?? '—';
  const sNote = last?.blood_pressure?.systolic?.levels  ? `— ${last.blood_pressure.systolic.levels}`   : '';
  const dNote = last?.blood_pressure?.diastolic?.levels ? `— ${last.blood_pressure.diastolic.levels}` : '';
  const sysCur = document.getElementById('sys-current'), diaCur = document.getElementById('dia-current');
  const sysNote = document.getElementById('sys-note'),   diaNote = document.getElementById('dia-note');
  if (sysCur)  sysCur.textContent  = sVal;
  if (diaCur)  diaCur.textContent  = dVal;
  if (sysNote) sysNote.textContent = sNote;
  if (diaNote) diaNote.textContent = dNote;
}

/* ------------ right panel + page init ------------ */
function renderPatient(p) {
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  const photo = document.getElementById('patient-photo');
  if (photo) photo.src = p.profile_picture || '';

  setText('patient-name', p.name || 'Jessica Taylor');
  setText('patient-gender', p.gender ?? '—');
  setText('patient-dob', p.date_of_birth ? fmtDOB(p.date_of_birth) : '—');
  setText('patient-phone', p.phone_number ?? '—');
  setText('patient-emergency', p.emergency_contact ?? '—');
  setText('patient-insurance', p.insurance_type ?? '—');

  // Right-panel icons (match assets you downloaded)
  const genderIcon = document.getElementById('gender-icon');
  if (genderIcon) {
    const isFemale = String(p.gender || '').toLowerCase() === 'female';
    genderIcon.src = `${ASSETS_DIR}/${isFemale ? 'FemaleIcon.svg' : 'MaleIcon.svg'}`;
  }
  const dobIcon = document.getElementById('dob-icon');
  if (dobIcon) dobIcon.src = `${ASSETS_DIR}/calendar.svg`;
  const phoneIcon1 = document.getElementById('phone-icon-1');
  const phoneIcon2 = document.getElementById('phone-icon-2');
  if (phoneIcon1) phoneIcon1.src = `${ASSETS_DIR}/PhoneIcon.svg`;
  if (phoneIcon2) phoneIcon2.src = `${ASSETS_DIR}/PhoneIcon.svg`;
  const insIcon = document.getElementById('ins-icon');
  if (insIcon) insIcon.src = `${ASSETS_DIR}/InsuranceIcon.svg`;

  // Chart + vitals
  const six = lastSix(p.diagnosis_history || []);
  const latest = six[six.length - 1];
  renderChart(six);
  renderVitals(latest);

  // Diagnostic table
  const tbody = document.querySelector('#diagnostic-table tbody');
  if (tbody) {
    tbody.innerHTML = '';
    (p.diagnostic_list || []).forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.name || ''}</td><td>${d.description || ''}</td><td>${d.status || ''}</td>`;
      tbody.appendChild(tr);
    });
  }

  // Lab results
  const labs = document.getElementById('lab-results');
  if (labs) {
    labs.innerHTML = '';
    (p.lab_results || []).forEach(name => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${name}</span>`;
      labs.appendChild(li);
    });
  }
}

function showAlert(msg) {
  const el = document.getElementById('app-alert');
  if (!el) return;
  el.textContent = msg;
  el.className = 'alert show';
}

async function init() {
  const data = await fetchPatients();
  const jess = data.find(p => String(p.name).toLowerCase() === 'jessica taylor');
  if (!jess) throw new Error('Jessica Taylor not found');
  renderRoster(data, 'Jessica Taylor');
  renderPatient(jess);
  window.__patients = data;
  window.__patient = jess;
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(e => {
    console.error(e);
    showAlert('Failed to load patient data. Open DevTools → Console for details.');
  });
});x