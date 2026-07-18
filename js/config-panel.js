const ConfigPanel = (() => {
    let debounceTimer = null;
    let typeDebounceTimer = null;
    let _skipTypeRerender = false;

    function init() {
        const fields = ['periodo', 'squad', 'dataInicio', 'dataFim', 'diasSprint', 'sprintStartNumber', 'referenceDate', 'roadmapNotes'];
        fields.forEach(field => {
            const el = document.getElementById('cfg-' + field);
            if (!el) return;
            el.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(applyConfig, 200);
            });
        });

        // Background color picker
        const colorPicker = document.getElementById('cfg-bgColor');
        const colorText = document.getElementById('cfg-bgColorText');
        if (colorPicker && colorText) {
            colorPicker.addEventListener('input', () => {
                colorText.value = colorPicker.value;
                applyBgColor(colorPicker.value);
            });
            colorText.addEventListener('input', () => {
                if (/^#[0-9a-fA-F]{6}$/.test(colorText.value)) {
                    colorPicker.value = colorText.value;
                    applyBgColor(colorText.value);
                }
            });
        }

        // Header color picker
        const headerColorPicker = document.getElementById('cfg-headerColor');
        const headerColorText = document.getElementById('cfg-headerColorText');
        if (headerColorPicker && headerColorText) {
            headerColorPicker.addEventListener('input', () => {
                headerColorText.value = headerColorPicker.value;
                _skipTypeRerender = true;
                State.setConfig({ headerColor: headerColorPicker.value });
                _skipTypeRerender = false;
            });
            headerColorText.addEventListener('input', () => {
                if (/^#[0-9a-fA-F]{6}$/.test(headerColorText.value)) {
                    headerColorPicker.value = headerColorText.value;
                    _skipTypeRerender = true;
                    State.setConfig({ headerColor: headerColorText.value });
                    _skipTypeRerender = false;
                }
            });
        }

        // Month band color picker
        const monthBandColorPicker = document.getElementById('cfg-monthBandColor');
        const monthBandColorText = document.getElementById('cfg-monthBandColorText');
        if (monthBandColorPicker && monthBandColorText) {
            monthBandColorPicker.addEventListener('input', () => {
                monthBandColorText.value = monthBandColorPicker.value;
                _skipTypeRerender = true;
                State.setConfig({ monthBandColor: monthBandColorPicker.value });
                _skipTypeRerender = false;
            });
            monthBandColorText.addEventListener('input', () => {
                if (/^#[0-9a-fA-F]{6}$/.test(monthBandColorText.value)) {
                    monthBandColorPicker.value = monthBandColorText.value;
                    _skipTypeRerender = true;
                    State.setConfig({ monthBandColor: monthBandColorText.value });
                    _skipTypeRerender = false;
                }
            });
        }

        // Sprint band color picker
        const sprintBandColorPicker = document.getElementById('cfg-sprintBandColor');
        const sprintBandColorText = document.getElementById('cfg-sprintBandColorText');
        if (sprintBandColorPicker && sprintBandColorText) {
            sprintBandColorPicker.addEventListener('input', () => {
                sprintBandColorText.value = sprintBandColorPicker.value;
                _skipTypeRerender = true;
                State.setConfig({ sprintBandColor: sprintBandColorPicker.value });
                _skipTypeRerender = false;
            });
            sprintBandColorText.addEventListener('input', () => {
                if (/^#[0-9a-fA-F]{6}$/.test(sprintBandColorText.value)) {
                    sprintBandColorPicker.value = sprintBandColorText.value;
                    _skipTypeRerender = true;
                    State.setConfig({ sprintBandColor: sprintBandColorText.value });
                    _skipTypeRerender = false;
                }
            });
        }

        const applyBtn = document.getElementById('btn-apply-config');
        if (applyBtn) applyBtn.addEventListener('click', applyConfig);

        populateForm();
        renderTypeManagement();
        State.on('config:changed', populateForm);
        State.on('config:changed', () => {
            if (!_skipTypeRerender) renderTypeManagement();
        });
    }

    function applyBgColor(color) {
        _skipTypeRerender = true;
        State.setConfig({ bgColor: color });
        _skipTypeRerender = false;
    }

    function populateForm() {
        const cfg = State.getConfig();
        setVal('cfg-periodo', cfg.periodo);
        setVal('cfg-squad', cfg.squad);
        setVal('cfg-dataInicio', cfg.dataInicio);
        setVal('cfg-dataFim', cfg.dataFim);
        setVal('cfg-diasSprint', cfg.diasSprint);
        setVal('cfg-sprintStartNumber', cfg.sprintStartNumber);
        setVal('cfg-referenceDate', cfg.referenceDate || '');
        setVal('cfg-roadmapNotes', cfg.roadmapNotes || '');

        const bgColor = cfg.bgColor || '#0f172a';
        const colorPicker = document.getElementById('cfg-bgColor');
        const colorText = document.getElementById('cfg-bgColorText');
        if (colorPicker && colorPicker.value !== bgColor) colorPicker.value = bgColor;
        if (colorText && colorText.value !== bgColor) colorText.value = bgColor;

        const headerColor = cfg.headerColor || '#1e293b';
        const headerColorPicker = document.getElementById('cfg-headerColor');
        const headerColorText = document.getElementById('cfg-headerColorText');
        if (headerColorPicker && headerColorPicker.value !== headerColor) headerColorPicker.value = headerColor;
        if (headerColorText && headerColorText.value !== headerColor) headerColorText.value = headerColor;

        const monthBandColor = cfg.monthBandColor || '#1e293b';
        const mbPicker = document.getElementById('cfg-monthBandColor');
        const mbText = document.getElementById('cfg-monthBandColorText');
        if (mbPicker && mbPicker.value !== monthBandColor) mbPicker.value = monthBandColor;
        if (mbText && mbText.value !== monthBandColor) mbText.value = monthBandColor;

        const sprintBandColor = cfg.sprintBandColor || '#334155';
        const sbPicker = document.getElementById('cfg-sprintBandColor');
        const sbText = document.getElementById('cfg-sprintBandColorText');
        if (sbPicker && sbPicker.value !== sprintBandColor) sbPicker.value = sprintBandColor;
        if (sbText && sbText.value !== sprintBandColor) sbText.value = sprintBandColor;
    }

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el && el.value !== String(val)) el.value = val;
    }

    function applyConfig() {
        State.setConfig({
            periodo: getVal('cfg-periodo'),
            squad: getVal('cfg-squad'),
            dataInicio: getVal('cfg-dataInicio'),
            dataFim: getVal('cfg-dataFim'),
            diasSprint: Math.max(1, parseInt(getVal('cfg-diasSprint'), 10) || 14),
            sprintStartNumber: parseInt(getVal('cfg-sprintStartNumber'), 10) || 1,
            bgColor: getVal('cfg-bgColor') || '#0f172a',
            headerColor: getVal('cfg-headerColor') || '#1e293b',
            monthBandColor: getVal('cfg-monthBandColor') || '#1e293b',
            sprintBandColor: getVal('cfg-sprintBandColor') || '#334155',
            referenceDate: getVal('cfg-referenceDate') || '',
            roadmapNotes: getVal('cfg-roadmapNotes') || ''
        });
    }

    function getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }

    function escapeAttr(str) {
        return (str == null ? '' : String(str))
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function renderTypeManagement() {
        if (_skipTypeRerender) return;
        const container = document.getElementById('type-management-container');
        if (!container) return;

        const itemTypes = State.getItemTypes();
        const statusTypes = State.getStatusTypes();

        container.innerHTML = `
            <div class="editor-divider"></div>
            <div class="config-section-title">Tipos de Item</div>
            <div class="type-list" id="item-types-list">
                ${itemTypes.map((t, i) => `
                    <div class="type-row">
                        <input type="color" class="type-color-picker" value="${escapeAttr(t.color)}" data-idx="${i}" data-kind="item" style="width:32px;height:28px;padding:2px;border-radius:4px;cursor:pointer;flex-shrink:0;">
                        <input type="text" class="type-label-input" value="${escapeAttr(t.label)}" data-idx="${i}" data-kind="item" placeholder="Rótulo">
                        <button class="btn btn-danger btn-sm type-delete-btn" data-idx="${i}" data-kind="item" ${itemTypes.length <= 1 ? 'disabled' : ''}>✕</button>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-secondary btn-sm btn-block" id="btn-add-item-type">+ Tipo de Item</button>

            <div class="editor-divider"></div>
            <div class="config-section-title">Tipos de Status</div>
            <div class="type-list" id="status-types-list">
                ${statusTypes.map((s, i) => `
                    <div class="type-row">
                        <input type="text" class="type-icon-input" value="${escapeAttr(s.icon)}" data-idx="${i}" data-kind="status" placeholder="ícone" style="width:42px;text-align:center;flex-shrink:0;">
                        <input type="text" class="type-label-input" value="${escapeAttr(s.label)}" data-idx="${i}" data-kind="status" placeholder="Rótulo">
                        <button class="btn btn-danger btn-sm type-delete-btn" data-idx="${i}" data-kind="status" ${s.value === '' ? 'disabled' : ''}>✕</button>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-secondary btn-sm btn-block" id="btn-add-status-type">+ Tipo de Status</button>

            <div class="editor-divider"></div>
            <div class="config-section-title">Membros do Time</div>
            <div class="type-list" id="team-members-list">
                ${(State.getTeamMembers()).map((m, i) => `
                    <div class="type-row">
                        <div class="member-avatar-small" style="background:${escapeAttr(m.color)};color:${State.getContrastColor(m.color)};">${escapeHtml((m.name || '?')[0].toUpperCase())}</div>
                        <input type="text" class="member-name-input" value="${escapeAttr(m.name)}" data-idx="${i}" placeholder="Nome">
                        <input type="color" class="member-color-picker" value="${escapeAttr(m.color)}" data-idx="${i}" style="width:32px;height:28px;padding:2px;border-radius:4px;cursor:pointer;flex-shrink:0;">
                        <button class="btn btn-danger btn-sm type-delete-btn" data-idx="${i}" data-kind="member">✕</button>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-secondary btn-sm btn-block" id="btn-add-member">+ Membro</button>

            <div class="editor-divider"></div>
            <div class="config-section-title">Marcos</div>
            <div class="type-list" id="milestones-list">
                ${(State.getMilestones()).map((m, i) => `
                    <div class="type-row">
                        <input type="date" class="milestone-date-input" value="${escapeAttr(m.date || '')}" data-idx="${i}" style="flex:1;min-width:0;">
                        <input type="text" class="milestone-label-input" value="${escapeAttr(m.label || '')}" data-idx="${i}" placeholder="Rótulo" style="flex:1;min-width:0;">
                        <input type="color" class="milestone-color-picker" value="${escapeAttr(/^#[0-9a-fA-F]{6}$/.test(m.color) ? m.color : '#ef4444')}" data-idx="${i}" style="width:32px;height:28px;padding:2px;border-radius:4px;cursor:pointer;flex-shrink:0;">
                        <button class="btn btn-danger btn-sm type-delete-btn" data-idx="${i}" data-kind="milestone">✕</button>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-secondary btn-sm btn-block" id="btn-add-milestone">+ Marco</button>
        `;

        bindTypeManagementEvents(container, itemTypes, statusTypes);
    }

    function bindTypeManagementEvents(container, itemTypes, statusTypes) {
        const teamMembers = State.getTeamMembers();

        // Team member events
        container.querySelector('#btn-add-member').addEventListener('click', () => {
            const colors = ['#6366f1', '#ec4899', '#f97316', '#14b8a6', '#8b5cf6', '#ef4444', '#22c55e', '#3b82f6'];
            const color = colors[teamMembers.length % colors.length];
            const newMembers = [...teamMembers, { id: State.generateTypeId('mb'), name: 'Novo Membro', color }];
            State.setConfig({ teamMembers: newMembers });
        });

        container.querySelectorAll('.member-name-input').forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(typeDebounceTimer);
                typeDebounceTimer = setTimeout(() => {
                    const idx = parseInt(input.dataset.idx, 10);
                    _skipTypeRerender = true;
                    State.setConfig({ teamMembers: teamMembers.map((m, i) => i === idx ? { ...m, name: input.value } : m) });
                    _skipTypeRerender = false;
                }, 300);
            });
        });

        container.querySelectorAll('.member-color-picker').forEach(picker => {
            picker.addEventListener('input', () => {
                const idx = parseInt(picker.dataset.idx, 10);
                _skipTypeRerender = true;
                State.setConfig({ teamMembers: teamMembers.map((m, i) => i === idx ? { ...m, color: picker.value } : m) });
                _skipTypeRerender = false;
            });
            picker.addEventListener('change', () => renderTypeManagement());
        });

        container.querySelectorAll('[data-kind="member"].type-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx, 10);
                State.setConfig({ teamMembers: teamMembers.filter((_, i) => i !== idx) });
            });
        });

        // Milestone events
        const milestones = State.getMilestones();
        container.querySelector('#btn-add-milestone').addEventListener('click', () => {
            const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
            const color = colors[milestones.length % colors.length];
            const date = State.getConfig().dataInicio || '';
            const newMs = [...milestones, { id: State.generateTypeId('ms'), date, label: 'Novo Marco', color }];
            State.setConfig({ milestones: newMs });
        });

        container.querySelectorAll('.milestone-date-input').forEach(input => {
            input.addEventListener('input', () => {
                const idx = parseInt(input.dataset.idx, 10);
                _skipTypeRerender = true;
                State.setConfig({ milestones: milestones.map((m, i) => i === idx ? { ...m, date: input.value } : m) });
                _skipTypeRerender = false;
            });
        });

        container.querySelectorAll('.milestone-label-input').forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(typeDebounceTimer);
                typeDebounceTimer = setTimeout(() => {
                    const idx = parseInt(input.dataset.idx, 10);
                    _skipTypeRerender = true;
                    State.setConfig({ milestones: milestones.map((m, i) => i === idx ? { ...m, label: input.value } : m) });
                    _skipTypeRerender = false;
                }, 300);
            });
        });

        container.querySelectorAll('.milestone-color-picker').forEach(picker => {
            picker.addEventListener('input', () => {
                const idx = parseInt(picker.dataset.idx, 10);
                _skipTypeRerender = true;
                State.setConfig({ milestones: milestones.map((m, i) => i === idx ? { ...m, color: picker.value } : m) });
                _skipTypeRerender = false;
            });
        });

        container.querySelectorAll('[data-kind="milestone"].type-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx, 10);
                State.setConfig({ milestones: milestones.filter((_, i) => i !== idx) });
            });
        });

        container.querySelector('#btn-add-item-type').addEventListener('click', () => {
            const newTypes = [...itemTypes, {
                value: State.generateTypeId('it'),
                label: 'Novo Tipo',
                color: '#6366f1'
            }];
            State.setConfig({ itemTypes: newTypes });
        });

        container.querySelector('#btn-add-status-type').addEventListener('click', () => {
            const newStatuses = [...statusTypes, {
                value: State.generateTypeId('st'),
                label: 'Novo Status',
                icon: ''
            }];
            State.setConfig({ statusTypes: newStatuses });
        });

        container.querySelectorAll('.type-delete-btn').forEach(btn => {
            if (btn.disabled) return;
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx, 10);
                const kind = btn.dataset.kind;
                if (kind === 'item') {
                    if (itemTypes.length <= 1) return;
                    State.setConfig({ itemTypes: itemTypes.filter((_, i) => i !== idx) });
                } else if (kind === 'status') {
                    if (statusTypes[idx] && statusTypes[idx].value === '') return;
                    State.setConfig({ statusTypes: statusTypes.filter((_, i) => i !== idx) });
                }
                // kind 'member'/'milestone' handled by their own dedicated listeners.
            });
        });

        container.querySelectorAll('.type-color-picker').forEach(picker => {
            picker.addEventListener('input', () => {
                const idx = parseInt(picker.dataset.idx, 10);
                _skipTypeRerender = true;
                State.setConfig({ itemTypes: itemTypes.map((t, i) => i === idx ? { ...t, color: picker.value } : t) });
                _skipTypeRerender = false;
            });
            picker.addEventListener('change', () => {
                renderTypeManagement();
            });
        });

        container.querySelectorAll('.type-label-input').forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(typeDebounceTimer);
                typeDebounceTimer = setTimeout(() => {
                    const idx = parseInt(input.dataset.idx, 10);
                    const kind = input.dataset.kind;
                    _skipTypeRerender = true;
                    if (kind === 'item') {
                        State.setConfig({ itemTypes: itemTypes.map((t, i) => i === idx ? { ...t, label: input.value } : t) });
                    } else {
                        State.setConfig({ statusTypes: statusTypes.map((s, i) => i === idx ? { ...s, label: input.value } : s) });
                    }
                    _skipTypeRerender = false;
                }, 300);
            });
        });

        container.querySelectorAll('.type-icon-input').forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(typeDebounceTimer);
                typeDebounceTimer = setTimeout(() => {
                    const idx = parseInt(input.dataset.idx, 10);
                    _skipTypeRerender = true;
                    State.setConfig({ statusTypes: statusTypes.map((s, i) => i === idx ? { ...s, icon: input.value } : s) });
                    _skipTypeRerender = false;
                }, 300);
            });
        });
    }

    return { init };
})();
