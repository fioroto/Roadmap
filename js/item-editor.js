const ItemEditor = (() => {
    let selectedItemId = null;

    function init() {
        document.getElementById('btn-add-item').addEventListener('click', addNewItem);
        State.on('state:changed', renderList);
        State.on('filters:changed', renderList);
        State.on('config:changed', () => {
            renderList();
            if (selectedItemId) renderForm(selectedItemId);
        });
        State.on('item:select', (id) => selectItem(id));
        renderList();
    }

    function currentFilters() {
        return (typeof Views !== 'undefined' && Views.getFilters) ? Views.getFilters() : null;
    }

    function renderList() {
        const listEl = document.getElementById('item-list');
        const allItems = State.getItems();

        if (!allItems.length) {
            listEl.innerHTML = '<div class="no-items-msg">Nenhum item cadastrado. Clique em + para adicionar.</div>';
            return;
        }

        const items = Engine.filterItems(allItems, currentFilters());
        if (!items.length) {
            listEl.innerHTML = '<div class="no-items-msg">Nenhum item encontrado para este filtro.</div>';
            return;
        }

        const cfgTypes = State.getItemTypes();
        const teamMembers = State.getTeamMembers();
        const healthTypes = State.getHealthTypes();
        const lanes = State.getLanes();

        // Group by lane (configured order, then "Sem trilha") when lanes exist.
        const groups = [];
        if (lanes.length) {
            lanes.forEach(l => {
                const its = items.filter(i => i.laneId === l.id);
                if (its.length) groups.push({ lane: l, items: its });
            });
            const rest = items.filter(i => !lanes.some(l => l.id === i.laneId));
            if (rest.length) groups.push({ lane: Engine.UNASSIGNED_LANE, items: rest });
        } else {
            groups.push({ lane: null, items });
        }

        listEl.innerHTML = groups.map(g => {
            const header = g.lane
                ? `<div class="item-list-lane"><span class="lane-color" style="background:${escapeAttr(g.lane.color)}"></span>${escapeHtml(g.lane.name)}</div>`
                : '';
            const cards = g.items.map(item => {
                const typeEntry = cfgTypes.find(t => t.value === item.type);
                const color = typeEntry ? typeEntry.color : '#6b7280';
                const selected = item.id === selectedItemId ? ' selected' : '';
                const member = item.responsavel ? teamMembers.find(m => m.id === item.responsavel) : null;
                const memberHtml = member ? `<div class="member-avatar-tiny" style="background:${member.color};color:${State.getContrastColor(member.color)};" title="${escapeHtml(member.name)}">${escapeHtml(member.name[0].toUpperCase())}</div>` : '';
                const highlightHtml = item.highlight ? '<span class="item-card-highlight" title="Destaque para stakeholders">★</span>' : '';
                const healthEntry = item.health ? healthTypes.find(h => h.value === item.health) : null;
                const healthHtml = healthEntry ? `<span class="health-dot health-${escapeAttr(item.health)}" title="${escapeAttr(healthEntry.label)}"></span>` : '';
                const progressHtml = item.progress > 0 ? `<span class="item-card-progress">${item.progress}%</span>` : '';
                return `
        <div class="item-card${selected}" data-id="${item.id}">
          <div class="item-card-dot" style="background:${color}"></div>
          <span class="item-card-title">${escapeHtml(item.title)}</span>
          ${highlightHtml}
          ${healthHtml}
          ${progressHtml}
          ${memberHtml}
          <div class="item-card-actions">
            <button data-action="edit" data-id="${item.id}" title="Editar">✎</button>
            <button data-action="delete" data-id="${item.id}" title="Excluir">✕</button>
          </div>
        </div>`;
            }).join('');
            return header + cards;
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
        const filters = currentFilters() || {};
        const laneId = filters.laneId && filters.laneId !== '__none__' ? filters.laneId : '';
        const id = State.addItem({
            title: 'Novo Item',
            type: firstType,
            laneId,
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

    function options(list, selected, labelOf) {
        return list.map(o => `<option value="${escapeAttr(o.value)}" ${selected === o.value ? 'selected' : ''}>${escapeHtml(labelOf ? labelOf(o) : o.label)}</option>`).join('');
    }

    // `draft` overrides item fields for rendering only (e.g. an extra empty link
    // row) so the form can grow without persisting half-filled data.
    function renderForm(id, draft) {
        const formEl = document.getElementById('item-form');
        const stored = State.getItems().find(i => i.id === id);
        if (!stored) { clearForm(); return; }
        const item = draft ? { ...stored, ...draft } : stored;

        const sprints = Engine.calculateSprints(State.getConfig());
        const cfgTypes = State.getItemTypes();
        const cfgStatuses = State.getStatusTypes();
        const teamMembers = State.getTeamMembers();
        const lanes = State.getLanes();
        const healthTypes = State.getHealthTypes();
        const confidenceTypes = State.getConfidenceTypes();
        const sizeTypes = State.getSizeTypes();
        const others = State.getItems().filter(i => i.id !== id);
        const itemsById = new Map(State.getItems().map(i => [i.id, i]));

        let html = `
      <div class="config-section-title">Editar Item</div>
      <div class="form-group">
        <label for="edit-title">Título</label>
        <input type="text" id="edit-title" value="${escapeAttr(item.title)}">
      </div>
      <div class="form-group">
        <label for="edit-lane">Trilha</label>
        <div style="display:flex; gap:6px;">
          <select id="edit-lane" style="flex:1; min-width:0;">
            <option value="" ${!item.laneId ? 'selected' : ''}>Sem trilha</option>
            ${options(lanes.map(l => ({ value: l.id, label: l.name })), item.laneId)}
          </select>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-new-lane" title="Criar nova trilha">+ Trilha</button>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="edit-type">Tipo</label>
          <select id="edit-type">${options(cfgTypes, item.type)}</select>
        </div>
        <div class="form-group">
          <label for="edit-status">Status</label>
          <select id="edit-status">${options(cfgStatuses, item.status)}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="edit-responsavel">Responsável</label>
          <select id="edit-responsavel" ${teamMembers.length ? '' : 'disabled'}>
            <option value="" ${!item.responsavel ? 'selected' : ''}>${teamMembers.length ? 'Sem responsável' : 'Cadastre membros em Config'}</option>
            ${options(teamMembers.map(m => ({ value: m.id, label: m.name })), item.responsavel)}
          </select>
        </div>
        <div class="form-group">
          <label for="edit-size">Tamanho</label>
          <select id="edit-size">${options(sizeTypes, item.size)}</select>
        </div>
      </div>

      <div class="form-block-title">Sinais</div>
      <div class="form-group">
        <label for="edit-progress">Progresso <span id="edit-progress-value" class="form-inline-value">${item.progress}%</span></label>
        <input type="range" id="edit-progress" min="0" max="100" step="5" value="${item.progress}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="edit-health">Saúde</label>
          <select id="edit-health">${options(healthTypes, item.health)}</select>
        </div>
        <div class="form-group">
          <label for="edit-confidence">Confiança</label>
          <select id="edit-confidence">${options(confidenceTypes, item.confidence)}</select>
        </div>
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="edit-intruder" ${item.intruder ? 'checked' : ''}>
        <label for="edit-intruder">Intruder</label>
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="edit-highlight" ${item.highlight ? 'checked' : ''}>
        <label for="edit-highlight">Destaque para stakeholders</label>
      </div>

      <div class="form-block-title">Contexto</div>
      <div class="form-group">
        <label for="edit-outcome">Resultado esperado <span class="form-hint">(o problema que resolve, não só a entrega)</span></label>
        <textarea id="edit-outcome" rows="2">${escapeHtml(item.outcome)}</textarea>
      </div>
      <div class="form-group">
        <label for="edit-observacao">Observação</label>
        <textarea id="edit-observacao" rows="2">${escapeHtml(item.observacao)}</textarea>
      </div>
      <div class="form-group">
        <label>Links <span class="form-hint">(ticket, doc, PR)</span></label>
        <div id="edit-links">
          ${(item.links || []).map((l, i) => `
          <div class="link-row">
            <input type="text" data-field="link-label" data-idx="${i}" value="${escapeAttr(l.label)}" placeholder="Rótulo">
            <input type="url" data-field="link-url" data-idx="${i}" value="${escapeAttr(l.url)}" placeholder="https://…">
            <button type="button" class="btn btn-danger btn-sm" data-action="remove-link" data-idx="${i}" title="Remover link">✕</button>
          </div>`).join('')}
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-link" style="margin-top:6px;">+ Link</button>
      </div>

      <div class="form-block-title">Dependências <span class="form-hint">(este item depende de…)</span></div>
      <div id="edit-deps" class="dep-list">
        ${others.length ? others.map(o => {
            const checked = item.dependsOn.includes(o.id);
            const conflict = checked && Engine.hasDependencyConflict({ ...item, dependsOn: [o.id] }, itemsById);
            return `
          <label class="dep-row${conflict ? ' dep-row-conflict' : ''}">
            <input type="checkbox" data-field="dep" value="${escapeAttr(o.id)}" ${checked ? 'checked' : ''}>
            <span class="dep-row-title">${escapeHtml(o.title)}</span>
            ${conflict ? '<span class="dep-row-warn" title="Este item começa antes do fim da dependência">⚠ conflito</span>' : ''}
          </label>`;
        }).join('') : '<div class="no-items-msg" style="padding:6px 0;">Cadastre outros itens para criar dependências.</div>'}
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
        bindForm(id, stored);
    }

    function bindForm(id, item) {
        const formEl = document.getElementById('item-form');
        document.getElementById('btn-save-item').addEventListener('click', () => saveItem(id));

        // Auto-save on discrete controls; text fields wait for "Salvar".
        ['edit-status', 'edit-type', 'edit-lane', 'edit-intruder', 'edit-highlight', 'edit-responsavel',
            'edit-size', 'edit-health', 'edit-confidence'].forEach(fid => {
                const el = document.getElementById(fid);
                if (el) el.addEventListener('change', () => saveItem(id, true));
            });
        const progress = document.getElementById('edit-progress');
        const progressValue = document.getElementById('edit-progress-value');
        progress.addEventListener('input', () => { progressValue.textContent = progress.value + '%'; });
        progress.addEventListener('change', () => saveItem(id, true));
        formEl.querySelectorAll('[data-field="dep"]').forEach(cb => cb.addEventListener('change', () => saveItem(id, true)));

        // "+ Trilha": config:changed rebuilds this form, so collect first, then
        // create the lane and persist the collected values with the new laneId.
        document.getElementById('btn-new-lane').addEventListener('click', () => {
            const name = prompt('Nome da nova trilha:', 'Nova trilha');
            if (!name || !name.trim()) return;
            const values = collectForm(id);
            const laneId = State.addLane(name.trim());
            State.updateItem(id, { ...values, laneId });
            renderForm(id);
        });

        document.getElementById('btn-add-link').addEventListener('click', () => {
            const values = collectForm(id, { keepEmptyLinks: true });
            renderForm(id, { ...values, links: [...values.links, { label: '', url: '' }] });
            const rows = formEl.querySelectorAll('[data-field="link-url"]');
            if (rows.length) rows[rows.length - 1].focus();
        });

        formEl.querySelectorAll('[data-action="remove-link"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx, 10);
                const values = collectForm(id, { keepEmptyLinks: true });
                values.links.splice(idx, 1);
                renderForm(id, values);
            });
        });

        document.getElementById('btn-add-segment').addEventListener('click', () => {
            const sprints = Engine.calculateSprints(State.getConfig());
            const defaultSprint = sprints.length ? sprints[0].number : 1;
            const values = collectForm(id);
            values.segments.push({ sprintStart: defaultSprint, sprintEnd: defaultSprint, delays: [] });
            State.updateItem(id, values);
            renderForm(id);
        });

        formEl.querySelectorAll('[data-action="remove-segment"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const values = collectForm(id);
                values.segments.splice(parseInt(btn.dataset.seg, 10), 1);
                State.updateItem(id, values);
                renderForm(id);
            });
        });

        formEl.querySelectorAll('[data-action="add-delay"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const segIdx = parseInt(btn.dataset.seg, 10);
                const values = collectForm(id);
                const seg = values.segments[segIdx];
                seg.delays.push({ delaySprintStart: seg.sprintStart, delaySprintEnd: seg.sprintStart });
                State.updateItem(id, values);
                renderForm(id);
            });
        });

        formEl.querySelectorAll('[data-action="remove-delay"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const segIdx = parseInt(btn.dataset.seg, 10);
                const dIdx = parseInt(btn.dataset.delay, 10);
                const values = collectForm(id);
                values.segments[segIdx].delays.splice(dIdx, 1);
                State.updateItem(id, values);
                renderForm(id);
            });
        });

        void item;
    }

    // Reads every control of the open form into an updates object.
    function collectForm(id, opts) {
        const item = State.getItems().find(i => i.id === id);
        const formEl = document.getElementById('item-form');
        const val = fid => { const el = document.getElementById(fid); return el ? el.value : ''; };
        const chk = fid => { const el = document.getElementById(fid); return el ? el.checked : false; };

        const links = [];
        formEl.querySelectorAll('.link-row').forEach(row => {
            const label = row.querySelector('[data-field="link-label"]').value.trim();
            const url = row.querySelector('[data-field="link-url"]').value.trim();
            if (url || (opts && opts.keepEmptyLinks)) links.push({ label, url });
        });

        const dependsOn = [];
        formEl.querySelectorAll('[data-field="dep"]:checked').forEach(cb => dependsOn.push(cb.value));

        return {
            title: val('edit-title'),
            type: val('edit-type'),
            laneId: val('edit-lane'),
            status: val('edit-status'),
            responsavel: val('edit-responsavel'),
            size: val('edit-size'),
            progress: parseInt(val('edit-progress'), 10) || 0,
            health: val('edit-health'),
            confidence: val('edit-confidence'),
            intruder: chk('edit-intruder'),
            highlight: chk('edit-highlight'),
            outcome: val('edit-outcome'),
            observacao: val('edit-observacao'),
            links,
            dependsOn,
            segments: item.segments.map((seg, segIdx) => {
                const startSel = formEl.querySelector(`[data-field="seg-start"][data-seg="${segIdx}"]`);
                const endSel = formEl.querySelector(`[data-field="seg-end"][data-seg="${segIdx}"]`);
                const startOption = startSel ? startSel.options[startSel.selectedIndex] : null;
                const endOption = endSel ? endSel.options[endSel.selectedIndex] : null;
                return {
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
            })
        };
    }

    function saveItem(id, silent) {
        const item = State.getItems().find(i => i.id === id);
        if (!item) return;
        const updates = collectForm(id);
        const invalid = updates.links.filter(l => !/^https?:\/\//i.test(l.url));
        if (invalid.length) showToast('Links precisam começar com http:// ou https:// — os inválidos foram ignorados', 'error');
        State.updateItem(id, updates);
        // Dependency conflict badges depend on saved data; refresh the block.
        if (silent) renderForm(id);
        else { renderForm(id); showToast('Item salvo com sucesso', 'success'); }
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
