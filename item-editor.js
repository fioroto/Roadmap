const ItemEditor = (() => {
    let selectedItemId = null;

    const TYPE_OPTIONS = [
        { value: 'EV', label: 'EV' },
        { value: 'TaticoNegócio', label: 'Tático Negócio' },
        { value: 'TaticoEngenharia', label: 'Tático Engenharia' }
    ];

    const STATUS_OPTIONS = [
        { value: '', label: 'Nenhum' },
        { value: 'EmAndamento', label: 'Em Andamento' },
        { value: 'Finalizado', label: 'Finalizado' },
        { value: 'PendenteSubida', label: 'Pendente de Subida' }
    ];

    const TYPE_COLORS = {
        'EV': '#0d9488',
        'TaticoNegócio': '#d97706',
        'TaticoEngenharia': '#4f46e5'
    };

    function init() {
        document.getElementById('btn-add-item').addEventListener('click', addNewItem);
        State.on('state:changed', renderList);
        State.on('config:changed', () => {
            if (selectedItemId) renderForm(selectedItemId);
        });
        State.on('item:select', (id) => selectItem(id));
        renderList();
    }

    function renderList() {
        const listEl = document.getElementById('item-list');
        const items = State.getItems();

        if (!items.length) {
            listEl.innerHTML = '<div class="no-items-msg">Nenhum item cadastrado. Clique em + para adicionar.</div>';
            return;
        }

        listEl.innerHTML = items.map(item => {
            const color = TYPE_COLORS[item.type] || '#6b7280';
            const selected = item.id === selectedItemId ? ' selected' : '';
            return `
        <div class="item-card${selected}" data-id="${item.id}">
          <div class="item-card-dot" style="background:${color}"></div>
          <span class="item-card-title">${escapeHtml(item.title)}</span>
          <div class="item-card-actions">
            <button data-action="edit" data-id="${item.id}" title="Editar">✎</button>
            <button data-action="delete" data-id="${item.id}" title="Excluir">✕</button>
          </div>
        </div>`;
        }).join('');

        listEl.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('[data-action]')) return;
                selectItem(card.dataset.id);
            });
        });

        listEl.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => selectItem(btn.dataset.id));
        });

        listEl.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Excluir este item?')) {
                    State.deleteItem(btn.dataset.id);
                    if (selectedItemId === btn.dataset.id) {
                        selectedItemId = null;
                        clearForm();
                    }
                }
            });
        });
    }

    function selectItem(id) {
        selectedItemId = id;
        renderList();
        renderForm(id);
    }

    function addNewItem() {
        const sprints = Engine.calculateSprints(State.getConfig());
        const defaultSprint = sprints.length ? sprints[0].number : 1;
        const id = State.addItem({
            title: 'Novo Item',
            type: 'EV',
            intruder: false,
            status: '',
            observacao: '',
            segments: [{ sprintStart: defaultSprint, sprintEnd: defaultSprint, delays: [] }]
        });
        selectItem(id);
    }

    function renderForm(id) {
        const formEl = document.getElementById('item-form');
        const item = State.getItems().find(i => i.id === id);
        if (!item) { clearForm(); return; }

        const sprints = Engine.calculateSprints(State.getConfig());
        const sprintOptions = sprints.map(s => `<option value="${s.number}">Sprint ${s.number}</option>`).join('');

        let html = `
      <div class="config-section-title">Editar Item</div>
      <div class="form-group">
        <label>Título</label>
        <input type="text" id="edit-title" value="${escapeAttr(item.title)}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Tipo</label>
          <select id="edit-type">
            ${TYPE_OPTIONS.map(o => `<option value="${o.value}" ${item.type === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="edit-status">
            ${STATUS_OPTIONS.map(o => `<option value="${o.value}" ${item.status === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="edit-intruder" ${item.intruder ? 'checked' : ''}>
        <label for="edit-intruder">Intruder</label>
      </div>
      <div class="form-group">
        <label>Observação</label>
        <textarea id="edit-observacao" rows="2">${escapeHtml(item.observacao)}</textarea>
      </div>
      <div class="editor-divider"></div>
      <div class="config-section-title">Segmentos</div>`;

        item.segments.forEach((seg, segIdx) => {
            html += `
        <div class="segment-block">
          <div class="segment-header">
            <span class="segment-label">Segmento ${segIdx + 1}</span>
            <button class="btn btn-danger btn-sm" data-action="remove-segment" data-seg="${segIdx}">✕</button>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Sprint Início</label>
              <select data-field="seg-start" data-seg="${segIdx}">
                ${sprints.map(s => `<option value="${s.number}" ${seg.sprintStart === s.number ? 'selected' : ''}>Sprint ${s.number}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Sprint Fim</label>
              <select data-field="seg-end" data-seg="${segIdx}">
                ${sprints.map(s => `<option value="${s.number}" ${seg.sprintEnd === s.number ? 'selected' : ''}>Sprint ${s.number}</option>`).join('')}
              </select>
            </div>
          </div>`;

            (seg.delays || []).forEach((delay, dIdx) => {
                html += `
          <div class="delay-block">
            <div class="delay-header">
              <span class="delay-label">Delay ${dIdx + 1}</span>
              <button class="btn btn-danger btn-sm" data-action="remove-delay" data-seg="${segIdx}" data-delay="${dIdx}">✕</button>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Sprint Início</label>
                <select data-field="delay-start" data-seg="${segIdx}" data-delay="${dIdx}">
                  ${sprints.map(s => `<option value="${s.number}" ${delay.delaySprintStart === s.number ? 'selected' : ''}>Sprint ${s.number}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Sprint Fim</label>
                <select data-field="delay-end" data-seg="${segIdx}" data-delay="${dIdx}">
                  ${sprints.map(s => `<option value="${s.number}" ${delay.delaySprintEnd === s.number ? 'selected' : ''}>Sprint ${s.number}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>`;
            });

            html += `<button class="btn btn-secondary btn-sm" data-action="add-delay" data-seg="${segIdx}" style="margin-top:6px;">+ Delay</button>`;
            html += '</div>';
        });

        html += `
      <button class="btn btn-secondary btn-sm btn-block" id="btn-add-segment" style="margin-top:8px;">+ Segmento</button>
      <div class="btn-group">
        <button class="btn btn-primary btn-block" id="btn-save-item">Salvar</button>
      </div>`;

        formEl.innerHTML = html;

        // Bind events
        document.getElementById('btn-save-item').addEventListener('click', () => saveItem(id));

        // Auto-save on status/type/intruder change
        document.getElementById('edit-status').addEventListener('change', () => saveItem(id));
        document.getElementById('edit-type').addEventListener('change', () => saveItem(id));
        document.getElementById('edit-intruder').addEventListener('change', () => saveItem(id));

        document.getElementById('btn-add-segment').addEventListener('click', () => {
            const defaultSprint = sprints.length ? sprints[0].number : 1;
            item.segments.push({ sprintStart: defaultSprint, sprintEnd: defaultSprint, delays: [] });
            State.updateItem(id, { segments: item.segments });
            renderForm(id);
        });

        formEl.querySelectorAll('[data-action="remove-segment"]').forEach(btn => {
            btn.addEventListener('click', () => {
                item.segments.splice(parseInt(btn.dataset.seg, 10), 1);
                State.updateItem(id, { segments: item.segments });
                renderForm(id);
            });
        });

        formEl.querySelectorAll('[data-action="add-delay"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const segIdx = parseInt(btn.dataset.seg, 10);
                const seg = item.segments[segIdx];
                seg.delays.push({ delaySprintStart: seg.sprintStart, delaySprintEnd: seg.sprintStart });
                State.updateItem(id, { segments: item.segments });
                renderForm(id);
            });
        });

        formEl.querySelectorAll('[data-action="remove-delay"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const segIdx = parseInt(btn.dataset.seg, 10);
                const dIdx = parseInt(btn.dataset.delay, 10);
                item.segments[segIdx].delays.splice(dIdx, 1);
                State.updateItem(id, { segments: item.segments });
                renderForm(id);
            });
        });
    }

    function saveItem(id) {
        const item = State.getItems().find(i => i.id === id);
        if (!item) return;

        const formEl = document.getElementById('item-form');
        const updates = {
            title: document.getElementById('edit-title').value,
            type: document.getElementById('edit-type').value,
            status: document.getElementById('edit-status').value,
            intruder: document.getElementById('edit-intruder').checked,
            observacao: document.getElementById('edit-observacao').value,
            segments: item.segments.map((seg, segIdx) => {
                const startSel = formEl.querySelector(`[data-field="seg-start"][data-seg="${segIdx}"]`);
                const endSel = formEl.querySelector(`[data-field="seg-end"][data-seg="${segIdx}"]`);
                const newSeg = {
                    sprintStart: startSel ? parseInt(startSel.value, 10) : seg.sprintStart,
                    sprintEnd: endSel ? parseInt(endSel.value, 10) : seg.sprintEnd,
                    delays: (seg.delays || []).map((d, dIdx) => {
                        const ds = formEl.querySelector(`[data-field="delay-start"][data-seg="${segIdx}"][data-delay="${dIdx}"]`);
                        const de = formEl.querySelector(`[data-field="delay-end"][data-seg="${segIdx}"][data-delay="${dIdx}"]`);
                        return {
                            delaySprintStart: ds ? parseInt(ds.value, 10) : d.delaySprintStart,
                            delaySprintEnd: de ? parseInt(de.value, 10) : d.delaySprintEnd
                        };
                    })
                };
                return newSeg;
            })
        };

        State.updateItem(id, updates);
        showToast('Item salvo com sucesso', 'success');
    }

    function clearForm() {
        const formEl = document.getElementById('item-form');
        formEl.innerHTML = '<div class="no-items-msg">Selecione um item para editar</div>';
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    return { init, selectItem };
})();
