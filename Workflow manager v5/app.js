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
  { id: 'pj2', name: 'Peter Jackson' }
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
  let reorderState = { active: false, canvas: null, placeholder: null, axis: 'y' };

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
    if (isSequential) {
      ensureStack(canvas).appendChild(chip);
    } else if (isParallel) {
      ensureRow(canvas).appendChild(chip);
    } else {
      canvas.appendChild(chip);
      positionChip(chip, canvas, x, y);
    }
    canvas.classList.add('has-items');
    chip.querySelector('.remove').addEventListener('click', () => {
      chip.remove();
      if (isSequential) cleanupSequential(canvas);
      if (canvas.querySelectorAll('.chip').length === 0) canvas.classList.remove('has-items');
      autoGrow(canvas);
    });
    // Only enable free-move dragging when not in a structured mode
    if (!isSequential && !isParallel) {
      chip.addEventListener('mousedown', (e) => beginDragChip(e, chip));
    }
    if (isSequential) makeReorderable(chip, canvas, 'y');
    if (isParallel) makeReorderable(chip, canvas, 'x');
    autoGrow(canvas);
  }

  function positionChip(chip, canvas, x, y) {
    const rect = canvas.getBoundingClientRect();
    const cx = Math.max(6, Math.min(x - rect.left - 24, rect.width - chip.offsetWidth - 6));
    const cy = Math.max(6, Math.min(y - rect.top - 14, rect.height - chip.offsetHeight - 6));
    chip.style.left = `${cx}px`;
    chip.style.top = `${cy}px`;
  }

  function beginDragChip(e, chip) {
    // Ignore free-move drag when in sequential/parallel containers
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
      const container = reorderState.canvas.classList.contains('sequential') ? ensureStack(reorderState.canvas) : ensureRow(reorderState.canvas);
      const chips = Array.from(container.querySelectorAll('.chip'));
      const placeholder = reorderState.placeholder;
      if (reorderState.axis === 'y') {
        const y = e.clientY;
        const before = chips.find((c) => c !== draggingChip && y < c.getBoundingClientRect().top + c.offsetHeight / 2);
        if (before) container.insertBefore(placeholder, before); else container.appendChild(placeholder);
        draggingChip.style.position = 'absolute';
        draggingChip.style.pointerEvents = 'none';
        draggingChip.style.width = `${placeholder.offsetWidth}px`;
        draggingChip.style.left = `${placeholder.getBoundingClientRect().left}px`;
        draggingChip.style.top = `${y - draggingChip.offsetHeight / 2}px`;
      } else {
        const x = e.clientX;
        const before = chips.find((c) => c !== draggingChip && x < c.getBoundingClientRect().left + c.offsetWidth / 2);
        if (before) container.insertBefore(placeholder, before); else container.appendChild(placeholder);
        draggingChip.style.position = 'absolute';
        draggingChip.style.pointerEvents = 'none';
        draggingChip.style.height = `${placeholder.offsetHeight}px`;
        draggingChip.style.top = `${placeholder.getBoundingClientRect().top}px`;
        draggingChip.style.left = `${x - draggingChip.offsetWidth / 2}px`;
      }
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
      const container = reorderState.canvas.classList.contains('sequential') ? ensureStack(reorderState.canvas) : ensureRow(reorderState.canvas);
      container.insertBefore(draggingChip, reorderState.placeholder);
      reorderState.placeholder.remove();
      reorderState = { active: false, canvas: null, placeholder: null, axis: 'y' };
      draggingChip = null;
      autoGrow(container.parentElement);
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
      createChip(user, canvas, e.clientX, e.clientY);
      enforceLayout(canvas);
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

  function ensureStack(canvas) {
    let stack = canvas.querySelector('.stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'stack';
      canvas.appendChild(stack);
    }
    return stack;
  }

  function ensureRow(canvas) {
    let row = canvas.querySelector('.row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'row';
      canvas.appendChild(row);
    }
    return row;
  }

  function autoGrow(canvas) {
    // Let content dictate height by clearing fixed height; add padding to avoid clipping lines
    const content = canvas.querySelector('.stack, .row');
    if (!content) return;
    const extra = 120; // space for lines and end-of-flow label
    const desired = content.getBoundingClientRect().height + extra;
    canvas.style.minHeight = desired + 'px';
  }

  function enforceLayout(canvas) {
    if (canvas.classList.contains('parallel')) {
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
    if (canvas.classList.contains('sequential')) {
      const stack = ensureStack(canvas);
      Array.from(canvas.querySelectorAll('.chip')).forEach((c) => {
        if (c.parentElement !== stack) {
          c.style.left = '';
          c.style.top = '';
          stack.appendChild(c);
        }
      });
      autoGrow(canvas);
    }
  }

  function cleanupSequential(canvas) {
    const stack = canvas.querySelector('.stack');
    if (stack && stack.querySelectorAll('.chip').length === 0) {
      stack.remove();
      canvas.classList.remove('has-items');
    }
  }

  function makeReorderable(chip, canvas, axis) {
    chip.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return; // don't start reorder when clicking remove
      const isSeq = canvas.classList.contains('sequential');
      const isPar = canvas.classList.contains('parallel');
      if (axis === 'y' && !isSeq) return;
      if (axis === 'x' && !isPar) return;
      const container = isSeq ? ensureStack(canvas) : ensureRow(canvas);
      if (!container.contains(chip)) return;
      draggingChip = chip;
      chip.classList.add('dragging');
      reorderState.active = true;
      reorderState.canvas = canvas;
      reorderState.axis = axis;
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
}

function serialization() {
  function chipData(canvas) {
    let list;
    if (canvas.classList.contains('sequential')) list = canvas.querySelectorAll('.stack .chip');
    else if (canvas.classList.contains('parallel')) list = canvas.querySelectorAll('.row .chip');
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
    });
  });

  document.getElementById('cancelBtn').addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('submitBtn').addEventListener('click', () => {
    const payload = serialization();
    // Basic validation: if mode is not skip and no users
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

  // Mode switching: toggle sequential / parallel classes
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
        // move existing absolute chips into stack in order of x/y
        const stack = (function(){ let s = canvas.querySelector('.stack'); if (!s) { s = document.createElement('div'); s.className = 'stack'; canvas.appendChild(s);} return s; })();
        const chips = Array.from(canvas.querySelectorAll(':scope > .chip, .row .chip'));
        chips.sort((a,b) => a.offsetTop - b.offsetTop || a.offsetLeft - b.offsetLeft).forEach((c) => { c.style.left = ''; c.style.top = ''; stack.appendChild(c); makeReorderable(c, canvas, 'y'); });
        if (canvas.querySelectorAll('.chip').length) canvas.classList.add('has-items');
      } else if (value === 'parallel') {
        canvas.classList.add('parallel');
        canvas.classList.remove('sequential');
        const row = (function(){ let r = canvas.querySelector('.row'); if (!r) { r = document.createElement('div'); r.className = 'row'; canvas.appendChild(r);} return r; })();
        const chips = Array.from(canvas.querySelectorAll(':scope > .chip, .stack .chip'));
        chips.sort((a,b) => a.offsetLeft - b.offsetLeft || a.offsetTop - b.offsetTop).forEach((c) => { c.style.left = ''; c.style.top = ''; row.appendChild(c); makeReorderable(c, canvas, 'x'); });
        if (canvas.querySelectorAll('.chip').length) canvas.classList.add('has-items');
      } else {
        if (wasSequential) {
          const stack = canvas.querySelector('.stack');
          if (stack) {
            const rect = canvas.getBoundingClientRect();
            let y = 20;
            Array.from(stack.querySelectorAll('.chip')).forEach((c, i) => {
              canvas.appendChild(c);
              c.style.left = `${rect.width * 0.45}px`;
              c.style.top = `${y}px`;
              y += c.offsetHeight + 18;
            });
            stack.remove();
          }
        }
        if (wasParallel) {
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
        canvas.classList.remove('sequential');
        canvas.classList.remove('parallel');
      }
    }
    radios.forEach((r) => r.addEventListener('change', update));
    update();
  }

  bindMode('reviewMode', 'reviewCanvas');
  bindMode('approvalMode', 'approvalCanvas');
}

// Boot
populateLists();
installDnD();
installControls();


