const Tooltip = (() => {
    let tooltipEl = null;

    function init() {
        tooltipEl = document.getElementById('tooltip-card');
    }

    function show(event, item, segmentIndex, sprints) {
        if (!tooltipEl) return;

        const seg = item.segments[segmentIndex];
        if (!seg) return;

        const typeLabels = {
            'EV': 'EV',
            'TaticoNegócio': 'Tático Negócio',
            'TaticoEngenharia': 'Tático Engenharia'
        };

        const statusLabels = {
            '': null,
            'Finalizado': 'Finalizado',
            'PendenteSubida': 'Pendente de Subida',
            'EmAndamento': 'Em Andamento'
        };

        let html = `<div class="tooltip-title">${escapeHtml(item.title)}</div>`;

        html += '<div class="tooltip-meta">';
        html += `<span class="tooltip-type-chip" style="background:${getTypeColor(item.type)}">${typeLabels[item.type] || item.type}</span>`;
        if (item.intruder) {
            html += '<span class="tooltip-intruder-badge">Intruder</span>';
        }
        const statusLabel = statusLabels[item.status];
        if (statusLabel) {
            html += `<span class="tooltip-status">${statusLabel}</span>`;
        }
        html += '</div>';

        html += '<div class="tooltip-detail">';
        html += `<div class="tooltip-row"><span class="tooltip-label">Segmento</span><span class="tooltip-value">Sprint ${seg.sprintStart} → Sprint ${seg.sprintEnd}</span></div>`;

        if (seg.delays && seg.delays.length > 0) {
            html += '<div class="tooltip-row"><span class="tooltip-label">Delays</span><span class="tooltip-value">';
            seg.delays.forEach((d, i) => {
                if (i > 0) html += ', ';
                html += `Sprint ${d.delaySprintStart}–${d.delaySprintEnd}`;
            });
            html += '</span></div>';
        }

        if (item.observacao) {
            html += `<div class="tooltip-obs"><span class="tooltip-label">Observação</span><div class="tooltip-obs-text">${escapeHtml(item.observacao)}</div></div>`;
        }

        html += '</div>';

        tooltipEl.innerHTML = html;
        tooltipEl.classList.add('visible');
        position(event);
    }

    function position(event) {
        if (!tooltipEl || !tooltipEl.classList.contains('visible')) return;

        const pad = 12;
        const rect = tooltipEl.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let x = event.clientX + pad;
        let y = event.clientY + pad;

        if (x + rect.width > vw - pad) x = event.clientX - rect.width - pad;
        if (y + rect.height > vh - pad) y = event.clientY - rect.height - pad;
        if (x < pad) x = pad;
        if (y < pad) y = pad;

        tooltipEl.style.left = x + 'px';
        tooltipEl.style.top = y + 'px';
    }

    function hide() {
        if (tooltipEl) tooltipEl.classList.remove('visible');
    }

    function getTypeColor(type) {
        const colors = { 'EV': '#0d9488', 'TaticoNegócio': '#d97706', 'TaticoEngenharia': '#4f46e5' };
        return colors[type] || '#6b7280';
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return { init, show, position, hide };
})();
