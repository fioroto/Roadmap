const ConfigPanel = (() => {
    let debounceTimer = null;
    let typeDebounceTimer = null;

    function init() {
        const fields = ['periodo', 'squad', 'dataInicio', 'dataFim', 'diasSprint', 'sprintStartNumber'];
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

        const applyBtn = document.getElementById('btn-apply-config');
        if (applyBtn) applyBtn.addEventListener('click', applyConfig);

        populateForm();
        renderTypeManagement();
        State.on('config:changed', populateForm);
        State.on('config:changed', renderTypeManagement);
    }

    function applyBgColor(color) {
        State.setConfig({ bgColor: color });
    }

    function populateForm() {
        const cfg = State.getConfig();
        setVal('cfg-periodo', cfg.periodo);
        setVal('cfg-squad', cfg.squad);
        setVal('cfg-dataInicio', cfg.dataInicio);
        setVal('cfg-dataFim', cfg.dataFim);
        setVal('cfg-diasSprint', cfg.diasSprint);
        setVal('cfg-sprintStartNumber', cfg.sprintStartNumber);

        const bgColor = cfg.bgColor || '#0f172a';
        const colorPicker = document.getElementById('cfg-bgColor');
        const colorText = document.getElementById('cfg-bgColorText');
        if (colorPicker && colorPicker.value !== bgColor) colorPicker.value = bgColor;
        if (colorText && colorText.value !== bgColor) colorText.value = bgColor;
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
            diasSprint: parseInt(getVal('cfg-diasSprint'), 10) || 14,
            sprintStartNumber: parseInt(getVal('cfg-sprintStartNumber'), 10) || 1,
            bgColor: getVal('cfg-bgColor') || '#0f172a'
        });
    }

    function getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }

    function escapeAttr(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function renderTypeManagement() {
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
        `;

        bindTypeManagementEvents(container, itemTypes, statusTypes);
    }

    function bindTypeManagementEvents(container, itemTypes, statusTypes) {
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
                } else {
                    if (statusTypes[idx] && statusTypes[idx].value === '') return;
                    State.setConfig({ statusTypes: statusTypes.filter((_, i) => i !== idx) });
                }
            });
        });

        container.querySelectorAll('.type-color-picker').forEach(picker => {
            picker.addEventListener('input', () => {
                const idx = parseInt(picker.dataset.idx, 10);
                State.setConfig({ itemTypes: itemTypes.map((t, i) => i === idx ? { ...t, color: picker.value } : t) });
            });
        });

        container.querySelectorAll('.type-label-input').forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(typeDebounceTimer);
                typeDebounceTimer = setTimeout(() => {
                    const idx = parseInt(input.dataset.idx, 10);
                    const kind = input.dataset.kind;
                    if (kind === 'item') {
                        State.setConfig({ itemTypes: itemTypes.map((t, i) => i === idx ? { ...t, label: input.value } : t) });
                    } else {
                        State.setConfig({ statusTypes: statusTypes.map((s, i) => i === idx ? { ...s, label: input.value } : s) });
                    }
                }, 300);
            });
        });

        container.querySelectorAll('.type-icon-input').forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(typeDebounceTimer);
                typeDebounceTimer = setTimeout(() => {
                    const idx = parseInt(input.dataset.idx, 10);
                    State.setConfig({ statusTypes: statusTypes.map((s, i) => i === idx ? { ...s, icon: input.value } : s) });
                }, 300);
            });
        });
    }

    return { init };
})();
