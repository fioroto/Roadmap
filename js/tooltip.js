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

        const teamMembers = State.getTeamMembers();
        const member = item.responsavel ? teamMembers.find(m => m.id === item.responsavel) : null;
        const lane = item.laneId ? State.getLanes().find(l => l.id === item.laneId) : null;
        const healthEntry = item.health ? State.getHealthTypes().find(h => h.value === item.health) : null;
        const confidenceEntry = State.getConfidenceTypes().find(c => c.value === item.confidence);
        const itemsById = new Map(State.getItems().map(i => [i.id, i]));

        let html = `<div class="tooltip-title">${escapeHtml(item.title)}</div>`;

        html += '<div class="tooltip-meta">';
        html += `<span class="tooltip-type-chip" style="background:${typeColor}">${escapeHtml(typeLabel)}</span>`;
        if (lane) {
            html += `<span class="tooltip-lane-chip"><span class="lane-color" style="background:${escapeAttr(lane.color)}"></span>${escapeHtml(lane.name)}</span>`;
        }
        if (item.intruder) {
            html += '<span class="tooltip-intruder-badge">Intruder</span>';
        }
        if (item.highlight) {
            html += '<span class="tooltip-highlight-badge">★ Destaque</span>';
        }
        if (statusEntry && statusEntry.value !== '') {
            html += `<span class="tooltip-status">${escapeHtml(statusEntry.label)}</span>`;
        }
        if (member) {
            html += `<span class="tooltip-member" style="background:${member.color};color:${State.getContrastColor(member.color)};">${escapeHtml(member.name)}</span>`;
        }
        html += '</div>';

        html += '<div class="tooltip-detail">';
        const startLabel = `Sprint ${seg.sprintStart}${seg.startHalf ? ' (meio)' : ''}`;
        const endLabel = `Sprint ${seg.sprintEnd}${seg.endHalf ? ' (meio)' : ''}`;
        html += `<div class="tooltip-row"><span class="tooltip-label">Segmento</span><span class="tooltip-value">${startLabel} → ${endLabel}</span></div>`;

        if (seg.delays && seg.delays.length > 0) {
            html += '<div class="tooltip-row"><span class="tooltip-label">Delays</span><span class="tooltip-value">';
            seg.delays.forEach((d, i) => {
                if (i > 0) html += ', ';
                html += `Sprint ${d.delaySprintStart}–${d.delaySprintEnd}`;
            });
            html += '</span></div>';
        }

        if (item.progress > 0) {
            html += `<div class="tooltip-row"><span class="tooltip-label">Progresso</span><span class="tooltip-value"><span class="tooltip-progress"><span style="width:${item.progress}%"></span></span> ${item.progress}%</span></div>`;
        }
        if (healthEntry) {
            html += `<div class="tooltip-row"><span class="tooltip-label">Saúde</span><span class="tooltip-value"><span class="health-dot health-${escapeAttr(item.health)}"></span> ${escapeHtml(healthEntry.label)}</span></div>`;
        }
        if (confidenceEntry && item.confidence !== 'high') {
            html += `<div class="tooltip-row"><span class="tooltip-label">Confiança</span><span class="tooltip-value">${escapeHtml(confidenceEntry.label)}</span></div>`;
        }
        if (item.size) {
            html += `<div class="tooltip-row"><span class="tooltip-label">Tamanho</span><span class="tooltip-value">${escapeHtml(item.size)}</span></div>`;
        }
        if (item.dependsOn && item.dependsOn.length) {
            const names = item.dependsOn.map(id => itemsById.get(id)).filter(Boolean).map(d => escapeHtml(d.title));
            if (names.length) {
                const conflict = Engine.hasDependencyConflict(item, itemsById);
                html += `<div class="tooltip-row"><span class="tooltip-label">Depende de</span><span class="tooltip-value">${names.join(', ')}${conflict ? ' <span class="tooltip-conflict">⚠ conflito</span>' : ''}</span></div>`;
            }
        }
        if (item.links && item.links.length) {
            html += `<div class="tooltip-row"><span class="tooltip-label">Links</span><span class="tooltip-value">${item.links.map(l => escapeHtml(l.label || l.url)).join(', ')}</span></div>`;
        }

        if (item.outcome) {
            html += `<div class="tooltip-obs"><span class="tooltip-label">Resultado esperado</span><div class="tooltip-obs-text">${escapeHtml(item.outcome)}</div></div>`;
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

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
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

    return { init, show, position, hide };
})();
