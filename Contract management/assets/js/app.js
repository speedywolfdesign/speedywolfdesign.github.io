/* Minimal interactions for the demo screen */
(function () {
  const adminBtn = document.getElementById('adminMenuBtn');
  const adminMenu = document.getElementById('adminMenu');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const search = document.getElementById('search');
  const tableBody = document.getElementById('tableBody');
  const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
  // Modal elements
  const modal = document.getElementById('contractModal');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const modalCloseFooter = document.getElementById('modalCloseFooter');
  const modalSave = document.getElementById('modalSave');
  const modalProjectName = document.getElementById('modalProjectName');
  const PROJECTS_KEY = 'cm:projects:list';
  const optCreate = document.getElementById('optCreate');
  const optPW = document.getElementById('optPW');
  const optG2 = document.getElementById('optG2');

  // Projects rendering to keep in sync with Projects page
  function loadProjects() {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveProjects(list) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
  }
  function appendProjectRow(p) {
    if (!tableBody) return;
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    tr.innerHTML = `
      <td class="px-4 py-3 text-gray-700">
        <span class="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 5h18v14H3V5Zm2 2v10h14V7H5Z"/>
          </svg>
          ${p.id}
        </span>
      </td>
      <td class="px-4 py-3"><a href="#" class="text-brand-700 hover:underline">${p.title}</a></td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">IM</span>
          <span class="text-gray-700">Iara Moran</span>
        </div>
      </td>
      <td class="px-4 py-3 text-gray-700">${(p.createdOn || (p.lastCalculated ? p.lastCalculated.split(' —')[0] : 'Apr 12, 2024'))}</td>
      <td class="px-4 py-3 text-gray-700">${p.contracts || 'Create new, Import from PW'}</td>
    `;
    tableBody.appendChild(tr);
  }
  function renderStoredProjects() {
    if (!tableBody) return;
    const stored = loadProjects();
    if (!stored.length) return;
    const toTs = (p) => {
      if (p.createdOn) {
        const t = Date.parse(p.createdOn);
        if (!Number.isNaN(t)) return t;
      }
      if (p.lastCalculated) {
        const base = p.lastCalculated.split(' —')[0];
        const t = Date.parse(base);
        if (!Number.isNaN(t)) return t;
      }
      return 0;
    };
    const sorted = [...stored].sort((a, b) => toTs(b) - toTs(a));
    tableBody.innerHTML = '';
    sorted.forEach(appendProjectRow);
  }
  function seedProjectsFromDomIfEmpty() {
    const current = loadProjects();
    if (current.length > 0 || !tableBody) return;
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    const seeded = [];
    rows.forEach((row) => {
      const idEl = row.querySelector('td:first-child');
      const nameEl = row.querySelector('td:nth-child(2)');
      const createdOnEl = row.querySelector('td:nth-child(4)');
      const contractsEl = row.querySelector('td:nth-child(5)');
      const id = idEl ? idEl.textContent.trim() : '';
      const title = nameEl ? nameEl.textContent.trim() : '';
      const createdOn = createdOnEl ? createdOnEl.textContent.trim() : '';
      const contracts = contractsEl ? contractsEl.textContent.trim() : '';
      if (id && title) seeded.push({ id, title, createdOn, contracts });
    });
    if (seeded.length) saveProjects(seeded);
  }

  // Find a project's saved contract settings by title
  function loadProjectSettingsByTitle(title) {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const rec = list.find((p) => (p.title || '').toLowerCase() === (title || '').toLowerCase());
      if (!rec) return null;
      if (rec.contractsSettings) return rec.contractsSettings;
      // Infer from text summary if settings missing
      const text = (rec.contracts || '').toLowerCase();
      return {
        createNew: text.includes('create new') || text === '',
        importPW: text.includes('import from pw'),
        g2: text.includes('g2')
      };
    } catch {
      return null;
    }
  }

  function closeOnOutsideClick(targetEl, containerEl) {
    if (!containerEl) return;
    if (!containerEl.contains(targetEl)) {
      containerEl.classList.add('hidden');
    }
  }

  function openModal(projectName) {
    if (modalProjectName && projectName) {
      modalProjectName.textContent = projectName;
    }
    // Reflect project contract options
    const settings = loadProjectSettingsByTitle(projectName) || { createNew: true, importPW: true, g2: false };
    if (optCreate) optCreate.checked = !!settings.createNew;
    if (optPW) optPW.checked = !!settings.importPW;
    if (optG2) optG2.checked = !!settings.g2;
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  if (adminBtn && adminMenu) {
    adminBtn.addEventListener('click', () => {
      adminMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (e.target === adminBtn || adminBtn.contains(e.target)) return;
      closeOnOutsideClick(e.target, adminMenu);
    });
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('hidden');
    });
  }

  // Sync projects with Projects page storage
  seedProjectsFromDomIfEmpty();
  renderStoredProjects();

  // Tabs (All / Favorites) – demo: Favorites filters down to first two rows
  function selectTab(name) {
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === name;
      btn.classList.toggle('bg-white', isActive);
      btn.classList.toggle('shadow-sm', isActive);
      btn.classList.toggle('text-gray-900', isActive);
      btn.classList.toggle('text-gray-600', !isActive);
    });
    // simplistic demo filter
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    rows.forEach((row, idx) => {
      if (name === 'favorites') {
        row.classList.toggle('hidden', idx > 1);
      } else {
        row.classList.remove('hidden');
      }
    });
  }
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => selectTab(btn.dataset.tab));
  });

  // Search filter on Name column
  if (search && tableBody) {
    // Row click opens modal
    tableBody.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      if (!row) return;
      const nameCell = row.children && row.children[1];
      const name = nameCell ? nameCell.textContent.trim() : 'Selected contract';
      // Avoid treating clicks on links as navigation
      e.preventDefault();
      openModal(name);
    });

    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      const rows = Array.from(tableBody.querySelectorAll('tr'));
      rows.forEach((row) => {
        const nameCell = row.children[1];
        const text = nameCell ? nameCell.textContent.toLowerCase() : '';
        row.classList.toggle('hidden', q && !text.includes(q));
      });
    });
  }

  // Modal wiring
  if (modal) {
    [modalOverlay, modalClose, modalCloseFooter].forEach((el) => {
      if (el) el.addEventListener('click', closeModal);
    });
    if (modalSave) {
      modalSave.addEventListener('click', () => {
        // Persist contract settings for this project
        const projectTitle = modalProjectName ? modalProjectName.textContent.trim() : '';
        const settings = {
          createNew: optCreate ? !!optCreate.checked : true,
          importPW: optPW ? !!optPW.checked : false,
          g2: optG2 ? !!optG2.checked : false
        };
        try {
          const raw = localStorage.getItem(PROJECTS_KEY);
          const list = raw ? JSON.parse(raw) : [];
          const idx = list.findIndex((p) => (p.title || '').toLowerCase() === projectTitle.toLowerCase());
          const contractsText = [
            settings.createNew ? 'Create new' : null,
            settings.importPW ? 'Import from PW' : null,
            settings.g2 ? 'G2' : null
          ].filter(Boolean).join(', ');
          if (idx >= 0) {
            list[idx].contractsSettings = settings;
            list[idx].contracts = contractsText;
          } else if (projectTitle) {
            // Create minimal record if not present
            list.push({
              id: '—',
              title: projectTitle,
              createdOn: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
              contracts: contractsText,
              contractsSettings: settings
            });
          }
          localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
          // Re-render table to reflect new "Contracts" column text
          renderStoredProjects();
        } catch {
          // ignore storage errors in demo
        }
        closeModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });
  }
})();


