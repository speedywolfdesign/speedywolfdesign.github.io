// v2 script: sequential behaves like parallel (horizontal) and shows connecting arrows

// Simple data to populate the lists
const reviewers = [
  { id: 'aj', name: 'Alana Jerez' },
  { id: 'dj', name: 'David Jones' },
  { id: 'ew', name: 'Elif Weiss' },
  { id: 'gp', name: 'Giana Press' },
  { id: 'lp', name: 'Louis Parol' },
  { id: 'ld', name: 'Lindsey Dokidis' },
  { id: 'mg', name: 'Maria Cage' },
  { id: 'pj', name: 'Peter Jackson' },
  { id: 'sl', name: 'Sergio Luiz' }
];

const approvers = [
  { id: 'br', name: 'Bruno Rahm' },
  { id: 'hd', name: 'Hanna Dokidis' },
  { id: 'jb', name: 'Jack Black' },
  { id: 'sw', name: 'Sandra Walheim' },
  { id: 'pj2', name: 'Peter Jackson' },
  { id: 'U1', name: 'User 1' },
  { id: 'U2', name: 'User 2' },
  { id: 'U3', name: 'User 3' },
  { id: 'U4', name: 'User 4' },
  { id: 'U5', name: 'User 5' }
];

function initials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function renderUser(poolElement, user) {
  const li = document.createElement('li');
  li.className = 'user-item';
  li.setAttribute('draggable', 'true');
  li.dataset.userId = user.id;
  li.dataset.userName = user.name;
  li.innerHTML = `
    <div class="avatar">${initials(user.name)}</div>
    <div class="user-name">${user.name}</div>
    <div class="user-hint">Drag</div>
  `;
  poolElement.appendChild(li);
}

function populateLists() {
  const reviewerPool = document.getElementById('reviewerPool');
  const approverPool = document.getElementById('approverPool');
  reviewers.forEach((u) => renderUser(reviewerPool, u));
  approvers.forEach((u) => renderUser(approverPool, u));
  document.getElementById('reviewerCount').textContent = `(${reviewers.length})`;
  document.getElementById('approverCount').textContent = `(${approvers.length})`;
}

function installDnD() {
  let draggingChip = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let reorderState = { active: false, canvas: null, placeholder: null, axis: 'x' };

  // rAF scheduler to avoid excessive redraws
  const rafIds = new WeakMap();
  function scheduleUpdate(canvas) {
    if (!canvas) return;
    if (rafIds.get(canvas)) return;
    const id = requestAnimationFrame(() => {
      rafIds.delete(canvas);
      updateConnectors(canvas);
    });
    rafIds.set(canvas, id);
  }

  function ensureRow(canvas) {
    let row = canvas.querySelector('.row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'row';
      canvas.appendChild(row);
    }
    // Bind scroll once to keep connectors in sync while horizontally scrolling
    if (!row.dataset.connectScrollBound) {
      row.addEventListener('scroll', () => scheduleUpdate(canvas), { passive: true });
      row.dataset.connectScrollBound = '1';
    }
    return row;
  }

  function ensureConnectors(canvas) {
    let svg = canvas.querySelector('svg.connectors');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('connectors');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.innerHTML = `
        <defs>
          <marker id="arrowHead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L10,3.5 L0,7 z" fill="#9fb1d6" />
          </marker>
        </defs>
      `;
      canvas.appendChild(svg);
    }
    return svg;
  }

  function clearConnectors(canvas) {
    const svg = canvas.querySelector('svg.connectors');
    if (!svg) return;
    Array.from(svg.querySelectorAll('path.connector')).forEach((p) => p.remove());
  }

  function updateConnectors(canvas) {
    clearConnectors(canvas);
    if (!canvas.classList.contains('sequential')) return;
    const row = ensureRow(canvas);
    const chips = Array.from(row.querySelectorAll('.chip'));
    if (chips.length <= 1) return;
    const svg = ensureConnectors(canvas);
    const cRect = canvas.getBoundingClientRect();
    for (let i = 0; i < chips.length - 1; i++) {
      const a = chips[i].getBoundingClientRect();
      const b = chips[i + 1].getBoundingClientRect();
      const x1 = a.right - cRect.left;
      const y1 = a.top - cRect.top + a.height / 2;
      const x2 = b.left - cRect.left;
      const y2 = b.top - cRect.top + b.height / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${x1} ${y1} C ${x1 + 24} ${y1}, ${x2 - 24} ${y2}, ${x2} ${y2}`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#9fb1d6');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('marker-end', 'url(#arrowHead)');
      path.setAttribute('class', 'connector');
      svg.appendChild(path);
    }
  }

  function createChip(user, canvas, x, y) {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.userId = user.id;
    chip.innerHTML = `
      <div class="avatar">${initials(user.name)}</div>
      <span>${user.name}</span>
      <button class="remove" title="Remove">✕</button>
    `;

    const isSequential = canvas.classList.contains('sequential');
    const isParallel = canvas.classList.contains('parallel');
    if (isSequential || isParallel) {
      ensureRow(canvas).appendChild(chip);
    } else {
      canvas.appendChild(chip);
      positionChip(chip, canvas, x, y);
    }
    canvas.classList.add('has-items');
    chip.querySelector('.remove').addEventListener('click', () => {
      chip.remove();
      if (canvas.querySelectorAll('.chip').length === 0) canvas.classList.remove('has-items');
      autoGrow(canvas);
      updateConnectors(canvas);
      const remaining = document.querySelectorAll(`.chip[data-user-id="${user.id}"]`).length;
      if (remaining === 0) {
        const poolItem = document.querySelector(`.user-item[data-user-id="${user.id}"]`);
        if (poolItem) {
          poolItem.classList.remove('disabled');
          poolItem.setAttribute('draggable', 'true');
        }
      }
    });
    if (!isSequential && !isParallel) {
      chip.addEventListener('mousedown', (e) => beginDragChip(e, chip));
    }
    if (isSequential || isParallel) makeReorderable(chip, canvas);
    autoGrow(canvas);
    updateConnectors(canvas);
  }

  function positionChip(chip, canvas, x, y) {
    const rect = canvas.getBoundingClientRect();
    const cx = Math.max(6, Math.min(x - rect.left - 24, rect.width - chip.offsetWidth - 6));
    const cy = Math.max(6, Math.min(y - rect.top - 14, rect.height - chip.offsetHeight - 6));
    chip.style.left = `${cx}px`;
    chip.style.top = `${cy}px`;
  }

  function beginDragChip(e, chip) {
    const canvas = chip.closest('.canvas');
    if (canvas && (canvas.classList.contains('sequential') || canvas.classList.contains('parallel'))) {
      return;
    }
    draggingChip = chip;
    chip.classList.add('dragging');
    const rect = chip.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (reorderState.active) {
      const container = ensureRow(reorderState.canvas);
      const chips = Array.from(container.querySelectorAll('.chip'));
      const placeholder = reorderState.placeholder;
      const x = e.clientX;
      const before = chips.find((c) => c !== draggingChip && x < c.getBoundingClientRect().left + c.offsetWidth / 2);
      if (before) container.insertBefore(placeholder, before); else container.appendChild(placeholder);
      draggingChip.style.position = 'absolute';
      draggingChip.style.pointerEvents = 'none';
      draggingChip.style.height = `${placeholder.offsetHeight}px`;
      draggingChip.style.top = `${placeholder.getBoundingClientRect().top}px`;
      draggingChip.style.left = `${x - draggingChip.offsetWidth / 2}px`;
      // keep connectors stuck to chip edges while reordering
      scheduleUpdate(reorderState.canvas);
      return;
    }
    if (!draggingChip) return;
    const canvas = draggingChip.parentElement;
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left - dragOffsetX;
    let y = e.clientY - rect.top - dragOffsetY;
    x = Math.max(6, Math.min(x, rect.width - draggingChip.offsetWidth - 6));
    y = Math.max(6, Math.min(y, rect.height - draggingChip.offsetHeight - 6));
    draggingChip.style.left = `${x}px`;
    draggingChip.style.top = `${y}px`;
  }

  function onMouseUp() {
    if (!draggingChip) return;
    if (reorderState.active) {
      draggingChip.classList.remove('dragging');
      draggingChip.style.position = '';
      draggingChip.style.pointerEvents = '';
      draggingChip.style.left = '';
      draggingChip.style.top = '';
      const container = ensureRow(reorderState.canvas);
      container.insertBefore(draggingChip, reorderState.placeholder);
      reorderState.placeholder.remove();
      const canvas = reorderState.canvas;
      reorderState = { active: false, canvas: null, placeholder: null, axis: 'x' };
      draggingChip = null;
      autoGrow(container.parentElement);
      updateConnectors(canvas);
      return;
    }
    draggingChip.classList.remove('dragging');
    draggingChip = null;
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  function setupCanvas(canvas) {
    canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      canvas.classList.add('drop-target');
    });
    canvas.addEventListener('dragleave', () => canvas.classList.remove('drop-target'));
    canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      canvas.classList.remove('drop-target');
      const user = JSON.parse(e.dataTransfer.getData('application/x-user'));
      const poolItem = document.querySelector(`.user-item[data-user-id="${user.id}"]`);
      if (poolItem) {
        poolItem.classList.add('disabled');
        poolItem.setAttribute('draggable', 'false');
      }
      createChip(user, canvas, e.clientX, e.clientY);
      enforceLayout(canvas);
      scheduleUpdate(canvas);
    });
  }

  setupCanvas(document.getElementById('reviewCanvas'));
  setupCanvas(document.getElementById('approvalCanvas'));

  document.querySelectorAll('.user-item').forEach((el) => {
    el.addEventListener('dragstart', (e) => {
      el.classList.add('dragging');
      const user = { id: el.dataset.userId, name: el.dataset.userName };
      e.dataTransfer.setData('application/x-user', JSON.stringify(user));
      e.dataTransfer.effectAllowed = 'copy';
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
  });

  function autoGrow(canvas) {
    // v2 fixed height: no-op to prevent dynamic growth
  }

  function enforceLayout(canvas) {
    if (canvas.classList.contains('parallel') || canvas.classList.contains('sequential')) {
      const row = ensureRow(canvas);
      Array.from(canvas.querySelectorAll('.chip')).forEach((c) => {
        if (c.parentElement !== row) {
          c.style.left = '';
          c.style.top = '';
          row.appendChild(c);
        }
      });
      autoGrow(canvas);
      return;
    }
    autoGrow(canvas);
  }

  function makeReorderable(chip, canvas) {
    chip.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      const isStructured = canvas.classList.contains('sequential') || canvas.classList.contains('parallel');
      if (!isStructured) return;
      const container = ensureRow(canvas);
      if (!container.contains(chip)) return;
      draggingChip = chip;
      chip.classList.add('dragging');
      reorderState.active = true;
      reorderState.canvas = canvas;
      const placeholder = document.createElement('div');
      placeholder.style.height = `${chip.offsetHeight}px`;
      placeholder.style.width = `${chip.offsetWidth}px`;
      placeholder.style.border = '1px dashed #4ed0a5';
      placeholder.style.borderRadius = '8px';
      placeholder.style.opacity = '0.6';
      reorderState.placeholder = placeholder;
      container.insertBefore(placeholder, chip.nextSibling);
      e.preventDefault();
    });
  }

  // Expose for other modules (mode switch)
  window.__wmv2 = { updateConnectors };
}

function serialization() {
  function chipData(canvas) {
    let list;
    if (canvas.classList.contains('sequential') || canvas.classList.contains('parallel')) list = canvas.querySelectorAll('.row .chip');
    else list = canvas.querySelectorAll('.chip');
    return Array.from(list).map((chip) => ({
      id: chip.dataset.userId,
      name: chip.querySelector('span').textContent
    }));
  }
  function mode(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
  }
  return {
    project: document.getElementById('projectSelect').value,
    template: document.getElementById('templateSelect').value,
    review: {
      mode: mode('reviewMode'),
      users: chipData(document.getElementById('reviewCanvas'))
    },
    approval: {
      mode: mode('approvalMode'),
      users: chipData(document.getElementById('approvalCanvas'))
    }
  };
}

function installControls() {
  document.querySelectorAll('button.clear').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const canvas = document.getElementById(`${target}Canvas`);
      canvas.querySelectorAll('.chip').forEach((n) => n.remove());
      canvas.classList.remove('has-items');
      const svg = canvas.querySelector('svg.connectors');
      if (svg) svg.remove();
    });
  });

  document.getElementById('cancelBtn').addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('submitBtn').addEventListener('click', () => {
    const payload = serialization();
    const issues = [];
    if (payload.review.mode !== 'skip' && payload.review.mode !== 'automatic' && payload.review.users.length === 0) {
      issues.push('Add at least one reviewer or choose Automatic/Skip.');
    }
    if (payload.approval.mode !== 'skip' && payload.approval.mode !== 'automatic' && payload.approval.users.length === 0) {
      issues.push('Add at least one approver or choose Automatic/Skip.');
    }
    if (issues.length) {
      alert(issues.join('\n'));
      return;
    }
    console.log('Workflow payload', payload);
    alert('Workflow created! Open console to inspect payload.');
  });

  // Mode switching: sequential = horizontal row with connectors; parallel unchanged
  function bindMode(flowName, canvasId) {
    const radios = document.querySelectorAll(`input[name="${flowName}"]`);
    const canvas = document.getElementById(canvasId);
    function update() {
      const value = Array.from(radios).find((r) => r.checked)?.value;
      const wasSequential = canvas.classList.contains('sequential');
      const wasParallel = canvas.classList.contains('parallel');
      if (value === 'sequential') {
        canvas.classList.add('sequential');
        canvas.classList.remove('parallel');
        const row = (function(){ let r = canvas.querySelector('.row'); if (!r) { r = document.createElement('div'); r.className = 'row'; canvas.appendChild(r);} return r; })();
        const chips = Array.from(canvas.querySelectorAll(':scope > .chip, .stack .chip, .row .chip'));
        chips.sort((a,b) => a.offsetLeft - b.offsetLeft || a.offsetTop - b.offsetTop).forEach((c) => { c.style.left = ''; c.style.top = ''; row.appendChild(c); });
        if (canvas.querySelectorAll('.chip').length) canvas.classList.add('has-items');
        if (window.__wmv2) window.__wmv2.updateConnectors(canvas);
      } else if (value === 'parallel') {
        canvas.classList.add('parallel');
        canvas.classList.remove('sequential');
        const row = (function(){ let r = canvas.querySelector('.row'); if (!r) { r = document.createElement('div'); r.className = 'row'; canvas.appendChild(r);} return r; })();
        const chips = Array.from(canvas.querySelectorAll(':scope > .chip, .stack .chip, .row .chip'));
        chips.sort((a,b) => a.offsetLeft - b.offsetLeft || a.offsetTop - b.offsetTop).forEach((c) => { c.style.left = ''; c.style.top = ''; row.appendChild(c); });
        if (canvas.querySelectorAll('.chip').length) canvas.classList.add('has-items');
        if (window.__wmv2) window.__wmv2.updateConnectors(canvas);
      } else {
        if (wasSequential || wasParallel) {
          const row = canvas.querySelector('.row');
          if (row) {
            const rect = canvas.getBoundingClientRect();
            let x = rect.width * 0.2;
            const y = rect.height * 0.45;
            Array.from(row.querySelectorAll('.chip')).forEach((c) => {
              canvas.appendChild(c);
              c.style.left = `${x}px`;
              c.style.top = `${y}px`;
              x += c.offsetWidth + 18;
            });
            row.remove();
          }
        }
        const svg = canvas.querySelector('svg.connectors');
        if (svg) svg.remove();
        canvas.classList.remove('sequential');
        canvas.classList.remove('parallel');
      }
    }
    radios.forEach((r) => r.addEventListener('change', update));
    update();
  }

  bindMode('reviewMode', 'reviewCanvas');
  bindMode('approvalMode', 'approvalCanvas');

  window.addEventListener('resize', () => {
    ['reviewCanvas', 'approvalCanvas'].forEach((id) => {
      const c = document.getElementById(id);
      if (c) { scheduleUpdate(c); }
    });
  });
}

// Boot
populateLists();
installDnD();
installControls();
