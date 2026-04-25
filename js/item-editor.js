const ItemEditor = (() => {
    let selectedItemId = null;
    let filterMemberId = '';

    function init() {
        document.getElementById('btn-add-item').addEventListener('click', addNewItem);
        State.on('state:changed', renderList);
        State.on('config:changed', () => {
            renderMemberFilter();
            if (selectedItemId) renderForm(selectedItemId);
        });
        State.on('item:select', (id) => selectItem(id));
        renderMemberFilter();
        renderList();
    }

    function renderMemberFilter() {
        const container = document.getElementById('member-filter-container');
        if (!container) return;
        const teamMembers = State.getTeamMembers();
        if (!teamMembers.length) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        container.innerHTML = `
            <label style="font-size:11px;color:var(--text-muted);white-space:nowrap;">Filtrar:</label>
            <select id="filter-member" style="flex:1;padding:4px 6px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-size:11px;font-family:var(--font-family);">
                <option value="">Todos</option>
                <option value="__none__" ${filterMemberId === '__none__' ? 'selected' : ''}>Sem responsável</option>
                ${teamMembers.map(m => `<option value="${m.id}" ${filterMemberId === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}
            </select>
        `;
        container.querySelector('#filter-member').addEventListener('change', (e) => {
            filterMemberId = e.target.value;
            renderList();
        });
    }

    function renderList() {
        const listEl = document.getElementById('item-list');
        let items = State.getItems();

        if (!items.length) {
            listEl.innerHTML = '<div class="no-items-msg">Nenhum item cadastrado. Clique em + para adicionar.</div>';
            return;
        }

        // Apply member filter
        if (filterMemberId === '__none__') {
            items = items.filter(i => !i.responsavel);
        } else if (filterMemberId) {
            items = items.filter(i => i.responsavel === filterMemberId);
        }

        if (!items.length) {
            listEl.innerHTML = '<div class="no-items-msg">Nenhum item encontrado para este filtro.</div>';
            return;
        }

        const cfgTypes = State.getItemTypes();
        const teamMembers = State.getTeamMembers();
        listEl.innerHTML = items.map(item => {
            const typeEntry = cfgTypes.find(t => t.value === item.type);
            const color = typeEntry ? typeEntry.color : '#6b7280';
            const selected = item.id === selectedItemId ? ' selected' : '';
            const member = item.responsavel ? teamMembers.find(m => m.id === item.responsavel) : null;
            const memberHtml = member ? `<div class="member-avatar-tiny" style="background:${member.color};color:${State.getContrastColor(member.color)};" title="${escapeHtml(member.name)}">${escapeHtml(member.name[0].toUpperCase())}</div>` : '';
            return `
        <div class="item-card${selected}" data-id="${item.id}">
          <div class="item-card-dot" style="background:${color}"></div>
          <span class="item-card-title">${escapeHtml(item.title)}</span>
          ${memberHtml}
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
        const cfg = State.getConfig();
        const firstType = (cfg.itemTypes && cfg.itemTypes[0]) ? cfg.itemTypes[0].value : 'EV';
        const sprints = Engine.calculateSprints(cfg);
        const defaultSprint = sprints.length ? sprints[0].number : 1;
        const id = State.addItem({
            title: 'Novo Item',
            type: firstType,
            intruder: false,
            status: '',
            observacao: '',
            segments: [{ sprintStart: defaultSprint, sprintEnd: defaultSprint, delays: [] }]
        });
        selectItem(id);
    }

    function sprintHalfOptions(sprints, selectedSprint, isHalf, mode) {
        // mode: 'start' or 'end'
        // For start: "Início" = not half (beginning), "Meio" = half (middle)
        // For end: "Meio" = half (middle), "Fim" = not half (end)
        let html = '';
        sprints.forEach(s => {
            if (mode === 'start') {
                const selBegin = (s.number === selectedSprint && !isHalf) ? 'selected' : '';
                const selMid = (s.number === selectedSprint && isHalf) ? 'selected' : '';
                html += `<option value="${s.number}" data-half="false" ${selBegin}>Sprint ${s.number} (início)</option>`;
                html += `<option value="${s.number}" data-half="true" ${selMid}>Sprint ${s.number} (meio)</option>`;
            } else {
                const selMid = (s.number === selectedSprint && isHalf) ? 'selected' : '';
                const selEnd = (s.number === selectedSprint && !isHalf) ? 'selected' : '';
                html += `<option value="${s.number}" data-half="true" ${selMid}>Sprint ${s.number} (meio)</option>`;
                html += `<option value="${s.number}" data-half="false" ${selEnd}>Sprint ${s.number} (fim)</option>`;
            }
        });
        return html;
    }

    function renderForm(id) {
        const formEl = document.getElementById('item-form');
        const item = State.getItems().find(i => i.id === id);
        if (!item) { clearForm(); return; }

        const sprints = Engine.calculateSprints(State.getConfig());
        const sprintOptions = sprints.map(s => `<option value="${s.number}">Sprint ${s.number}</option>`).join('');
        const cfgTypes = State.getItemTypes();
        const cfgStatuses = State.getStatusTypes();
        const teamMembers = State.getTeamMembers();

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
            ${cfgTypes.map(o => `<option value="${escapeAttr(o.value)}" ${item.type === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="edit-status">
            ${cfgStatuses.map(o => `<option value="${escapeAttr(o.value)}" ${item.status === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
          </select>
        </div>
      </div>
      ${teamMembers.length ? `
      <div class="form-group">
        <label>Responsável</label>
        <select id="edit-responsavel">
          <option value="" ${!item.responsavel ? 'selected' : ''}>Sem responsável</option>
          ${teamMembers.map(m => `<option value="${escapeAttr(m.id)}" ${item.responsavel === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}
        </select>
      </div>` : ''}
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
                ${sprintHalfOptions(sprints, seg.sprintStart, !!seg.startHalf, 'start')}
              </select>
            </div>
            <div class="form-group">
              <label>Sprint Fim</label>
              <select data-field="seg-end" data-seg="${segIdx}">
                ${sprintHalfOptions(sprints, seg.sprintEnd, !!seg.endHalf, 'end')}
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

        // Auto-save on status/type/intruder/responsavel change
        document.getElementById('edit-status').addEventListener('change', () => saveItem(id));
        document.getElementById('edit-type').addEventListener('change', () => saveItem(id));
        document.getElementById('edit-intruder').addEventListener('change', () => saveItem(id));
        const responsavelSelect = document.getElementById('edit-responsavel');
        if (responsavelSelect) responsavelSelect.addEventListener('change', () => saveItem(id));

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
        const responsavelEl = document.getElementById('edit-responsavel');
        const updates = {
            title: document.getElementById('edit-title').value,
            type: document.getElementById('edit-type').value,
            status: document.getElementById('edit-status').value,
            responsavel: responsavelEl ? responsavelEl.value : (item.responsavel || ''),
            intruder: document.getElementById('edit-intruder').checked,
            observacao: document.getElementById('edit-observacao').value,
            segments: item.segments.map((seg, segIdx) => {
                const startSel = formEl.querySelector(`[data-field="seg-start"][data-seg="${segIdx}"]`);
                const endSel = formEl.querySelector(`[data-field="seg-end"][data-seg="${segIdx}"]`);
                const startOption = startSel ? startSel.options[startSel.selectedIndex] : null;
                const endOption = endSel ? endSel.options[endSel.selectedIndex] : null;
                const newSeg = {
                    sprintStart: startSel ? parseInt(startSel.value, 10) : seg.sprintStart,
                    sprintEnd: endSel ? parseInt(endSel.value, 10) : seg.sprintEnd,
                    startHalf: startOption ? startOption.dataset.half === 'true' : !!seg.startHalf,
                    endHalf: endOption ? endOption.dataset.half === 'true' : !!seg.endHalf,
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
        return (str == null ? '' : String(str))
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    return { init, selectItem };
})();
