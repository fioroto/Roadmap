const Tooltip = (() => {
    let tooltipEl = null;

    function init() {
        tooltipEl = document.getElementById('tooltip-card');
    }

    function show(event, item, segmentIndex, sprints) {
        if (!tooltipEl) return;

        const seg = item.segments[segmentIndex];
        if (!seg) return;

        const cfgTypes = State.getItemTypes();
        const cfgStatuses = State.getStatusTypes();
        const typeEntry = cfgTypes.find(t => t.value === item.type);
        const typeColor = typeEntry ? typeEntry.color : '#6b7280';
        const typeLabel = typeEntry ? typeEntry.label : item.type;
        const statusEntry = cfgStatuses.find(s => s.value === item.status);

        let html = `<div class="tooltip-title">${escapeHtml(item.title)}</div>`;

        html += '<div class="tooltip-meta">';
        html += `<span class="tooltip-type-chip" style="background:${typeColor}">${escapeHtml(typeLabel)}</span>`;
        if (item.intruder) {
            html += '<span class="tooltip-intruder-badge">Intruder</span>';
        }
        if (statusEntry && statusEntry.value !== '') {
            html += `<span class="tooltip-status">${escapeHtml(statusEntry.label)}</span>`;
        }
        html += '</div>';

        html += '<div class="tooltip-detail">';
        html += `<div class="tooltip-row"><span class="tooltip-label">Segmento</span><span class="tooltip-value">${formatSprint(seg.sprintStart)} → ${formatSprint(seg.sprintEnd)}</span></div>`;

        if (seg.delays && seg.delays.length > 0) {
            html += '<div class="tooltip-row"><span class="tooltip-label">Delays</span><span class="tooltip-value">';
            seg.delays.forEach((d, i) => {
                if (i > 0) html += ', ';
                html += `${formatSprint(d.delaySprintStart)}–${formatSprint(d.delaySprintEnd)}`;
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

    function formatSprint(val) {
        if (val % 1 === 0.5) return `Sprint ${Math.floor(val)}½`;
        return `Sprint ${val}`;
    }

    function hide() {
        if (tooltipEl) tooltipEl.classList.remove('visible');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return { init, show, position, hide };
})();
