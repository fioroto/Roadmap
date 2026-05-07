const Renderer = (() => {

    let container = null;
    let sprints = [];
    let colWidth = 120;
    let selectedItemId = null;
    let currentSprintIdx = -1;
    let referenceDate = null;
    let spotlightActive = false;

    // Drag state
    let dragState = null;

    function init(el) {
        container = el;
        container.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // Tooltip via event delegation — single set of listeners for all bars.
        container.addEventListener('mouseover', onContainerMouseOver);
        container.addEventListener('mousemove', onContainerMouseMove);
        container.addEventListener('mouseout', onContainerMouseOut);
    }

    function onContainerMouseOver(e) {
        if (dragState) return;
        const bar = e.target.closest('.item-bar');
        if (!bar || !container.contains(bar)) return;
        // Only fire on entering the bar (not on inner element transitions).
        if (bar.contains(e.relatedTarget)) return;
        const itemId = bar.dataset.itemId;
        const segIdx = parseInt(bar.dataset.segmentIndex, 10);
        const item = State.getItems().find(i => i.id === itemId);
        if (item) Tooltip.show(e, item, segIdx, sprints);
    }

    function onContainerMouseMove(e) {
        if (dragState) return;
        if (e.target.closest('.item-bar')) Tooltip.position(e);
    }

    function onContainerMouseOut(e) {
        const bar = e.target.closest('.item-bar');
        if (!bar) return;
        if (bar.contains(e.relatedTarget)) return;
        Tooltip.hide();
    }

    function buildStickyHeader(sprintCount, monthBands) {
        let html = '<div class="roadmap-sticky-header">';

        html += `<div class="month-band" style="grid-template-columns: repeat(${sprintCount}, ${colWidth}px);">`;
        monthBands.forEach(band => {
            html += `<div class="month-cell" style="grid-column: span ${band.spanCount}">${escapeHtml(band.label)}</div>`;
        });
        html += '</div>';

        html += `<div class="sprint-band" style="grid-template-columns: repeat(${sprintCount}, ${colWidth}px);">`;
        sprints.forEach((s, idx) => {
            const label = `Sprint ${s.number}`;
            const dateRange = `${Engine.formatDateShort(s.startDate)} – ${Engine.formatDateShort(s.endDate)}`;
            const cellClass = idx === currentSprintIdx ? 'sprint-cell sprint-cell-current' : 'sprint-cell';
            const todayPill = idx === currentSprintIdx ? '<span class="sprint-today-pill">Hoje</span>' : '';
            html += `<div class="${cellClass}">${todayPill}<span class="sprint-number">${label}</span><span class="sprint-dates">${dateRange}</span></div>`;
        });
        html += '</div>';

        html += '</div>';
        return html;
    }

    function buildGridBackground(sprintCount) {
        let html = '';
        for (let i = 1; i < sprintCount; i++) {
            html += `<div class="sprint-separator" style="left: ${i * colWidth}px;"></div>`;
        }
        for (let i = 0; i < sprintCount; i++) {
            html += `<div class="sprint-separator sprint-mid-separator" style="left: ${i * colWidth + colWidth / 2}px;"></div>`;
        }
        for (let i = 0; i < sprintCount; i++) {
            if (i % 2 === 1) {
                html += `<div class="sprint-bg-alt" style="left: ${i * colWidth}px; width: ${colWidth}px;"></div>`;
            }
        }
        if (currentSprintIdx >= 0 && referenceDate) {
            html += `<div class="sprint-bg-current" style="left: ${currentSprintIdx * colWidth}px; width: ${colWidth}px;"></div>`;
            const sprint = sprints[currentSprintIdx];
            const totalDays = (sprint.endDate - sprint.startDate) / 86400000 + 1;
            let dayInSprint = (referenceDate - sprint.startDate) / 86400000;
            if (dayInSprint < 0) dayInSprint = 0;
            if (dayInSprint > totalDays) dayInSprint = totalDays;
            const px = currentSprintIdx * colWidth + (dayInSprint / totalDays) * colWidth;
            html += `<div class="today-line" style="left: ${px}px;"></div>`;
        }
        return html;
    }

    function buildItemBar(entry, minSprint, cfgItemTypes, cfgStatusTypes, teamMembers) {
        const item = entry.item;
        const track = entry.track;
        const typeEntry = cfgItemTypes.find(t => t.value === item.type) || cfgItemTypes[0] || { color: '#6b7280' };
        const typeColor = {
            bg: typeEntry.color,
            text: State.getContrastColor(typeEntry.color),
            border: State.darkenColor(typeEntry.color, 0.25)
        };

        const currentSprintNumber = currentSprintIdx >= 0 ? sprints[currentSprintIdx].number : null;
        const itemInCurrentSprint = currentSprintNumber !== null
            && item.segments.some(s => s.sprintStart <= currentSprintNumber && s.sprintEnd >= currentSprintNumber);

        let html = '';
        item.segments.forEach((seg, segIdx) => {
            const startOffset = seg.startHalf ? 0.5 : 0;
            const endOffset = seg.endHalf ? -0.5 : 0;
            const startCol = (seg.sprintStart - minSprint) + startOffset;
            const span = seg.sprintEnd - seg.sprintStart + 1 + endOffset - startOffset;
            const left = startCol * colWidth;
            const width = span * colWidth;
            const top = track * 52 + 8;

            let barClass = 'item-bar';
            if (item.intruder) barClass += ' intruder';
            if (item.highlight) barClass += ' highlight';
            else if (spotlightActive && !itemInCurrentSprint) barClass += ' dim';
            if (itemInCurrentSprint) barClass += ' in-current-sprint';
            if (item.id === selectedItemId) barClass += ' selected';

            const statusEntry = cfgStatusTypes.find(s => s.value === item.status);
            const statusIcon = statusEntry ? (statusEntry.icon || '') : '';
            const statusHtml = statusIcon ? `<span class="item-status-icon">${escapeHtml(statusIcon)}</span>` : '';

            const dataAttrs = `data-item-id="${escapeAttr(item.id)}" data-segment-index="${segIdx}" data-track="${track}"`;

            const member = item.responsavel ? teamMembers.find(m => m.id === item.responsavel) : null;
            const memberAvatarHtml = member ? `<div class="item-bar-avatar" style="background:${member.color};color:${State.getContrastColor(member.color)};" title="${escapeAttr(member.name)}">${escapeHtml(member.name[0].toUpperCase())}</div>` : '';

            html += `<div class="${barClass}" ${dataAttrs} role="button" tabindex="0" aria-label="${escapeAttr(item.title)}" style="left:${left}px; width:${width}px; top:${top}px; background:${typeColor.bg}; color:${typeColor.text}; border-color:${typeColor.border};">`;
            html += `<div class="resize-handle resize-handle-left" data-item-id="${escapeAttr(item.id)}" data-segment-index="${segIdx}" data-side="left" role="button" aria-label="Redimensionar início"></div>`;
            html += memberAvatarHtml;
            html += `<span class="item-title">${escapeHtml(item.title)}</span>`;
            html += statusHtml;

            (seg.delays || []).forEach(delay => {
                const dStart = delay.delaySprintStart - seg.sprintStart;
                const dSpan = delay.delaySprintEnd - delay.delaySprintStart + 1;
                const dLeft = (dStart / span) * 100;
                const dWidth = (dSpan / span) * 100;
                html += `<div class="delay-overlay" style="left:${dLeft}%; width:${dWidth}%;"></div>`;
            });

            html += `<div class="resize-handle resize-handle-right" data-item-id="${escapeAttr(item.id)}" data-segment-index="${segIdx}" data-side="right" role="button" aria-label="Redimensionar fim"></div>`;
            html += '</div>';
        });
        return html;
    }

    function buildGrid(sprintCount, gridHeight, trackEntries) {
        const minSprint = sprints[0].number;
        const cfgItemTypes = State.getItemTypes();
        const cfgStatusTypes = State.getStatusTypes();
        const teamMembers = State.getTeamMembers();

        let html = `<div class="roadmap-grid" id="roadmap-grid" style="width: ${sprintCount * colWidth}px; min-height: ${gridHeight}px; position: relative;">`;
        html += buildGridBackground(sprintCount);
        trackEntries.forEach(entry => {
            html += buildItemBar(entry, minSprint, cfgItemTypes, cfgStatusTypes, teamMembers);
        });
        html += '</div>';
        return html;
    }

    function render() {
        if (!container) return;
        const config = State.getConfig();
        const items = State.getItems();
        sprints = Engine.calculateSprints(config);

        if (!sprints.length) {
            container.innerHTML = '<div class="roadmap-empty">Configure as datas para gerar o roadmap.</div>';
            return;
        }

        const monthBands = Engine.calculateMonthBands(sprints);
        const clampedItems = Engine.clampSegments(items, sprints);
        const trackEntries = Engine.allocateTracks(clampedItems, sprints);
        const trackCount = trackEntries.length ? Math.max(...trackEntries.map(e => e.track)) + 1 : 0;
        const sprintCount = sprints.length;

        const refDateStr = (config.referenceDate || '').trim();
        referenceDate = refDateStr ? new Date(refDateStr + 'T12:00:00') : new Date();
        if (isNaN(referenceDate.getTime())) referenceDate = new Date();
        currentSprintIdx = Engine.getCurrentSprintIndex(sprints, referenceDate);
        spotlightActive = currentSprintIdx >= 0 || items.some(i => i.highlight);

        const wrapperEl = container.closest('.roadmap-wrapper');
        const panel = document.getElementById('side-panel');
        const panelOpen = panel && !panel.classList.contains('collapsed');
        const availableWidth = wrapperEl.clientWidth - (panelOpen ? 380 : 0);
        colWidth = Math.max(80, Math.floor(availableWidth / sprintCount));

        const headerEl = document.getElementById('roadmap-title');
        const subtitleEl = document.getElementById('roadmap-subtitle');
        if (headerEl) headerEl.textContent = `ROADMAP ${config.periodo}`;
        if (subtitleEl) subtitleEl.textContent = config.squad;

        renderLegend();

        const gridHeight = Math.max(trackCount, 3) * 52 + 16;
        const notes = (config.roadmapNotes || '').trim();
        const notesHtml = notes
            ? `<div class="roadmap-notes"><div class="roadmap-notes-title">Observações</div><div class="roadmap-notes-body">${escapeHtml(notes)}</div></div>`
            : '';

        container.innerHTML =
            buildStickyHeader(sprintCount, monthBands) +
            buildGrid(sprintCount, gridHeight, trackEntries) +
            notesHtml;

        const addBtn = document.getElementById('btn-roadmap-add');
        if (addBtn) {
            addBtn.onclick = (e) => {
                e.stopPropagation();
                addItemOnRoadmap();
            };
        }
    }

    function setSelectedItem(id) {
        selectedItemId = id;
        // Highlight on roadmap without full re-render
        container.querySelectorAll('.item-bar').forEach(bar => {
            bar.classList.toggle('selected', bar.dataset.itemId === id);
        });
    }

    function addItemOnRoadmap() {
        const cfg = State.getConfig();
        const firstType = (cfg.itemTypes && cfg.itemTypes[0]) ? cfg.itemTypes[0].value : 'EV';
        const defaultSprint = sprints.length ? sprints[0].number : 1;
        const id = State.addItem({
            title: 'Novo Item',
            type: firstType,
            intruder: false,
            status: '',
            observacao: '',
            segments: [{ sprintStart: defaultSprint, sprintEnd: defaultSprint, delays: [] }]
        });
        // Switch to items tab and select the new item
        switchToItemsTab();
        State.emit('item:select', id);
    }

    function switchToItemsTab() {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
        const itemsTab = document.querySelector('[data-target="section-items"]');
        if (itemsTab) itemsTab.classList.add('active');
        const itemsSection = document.getElementById('section-items');
        if (itemsSection) itemsSection.classList.add('active');
    }

    // ─── Drag & Drop / Resize ─────────────────────

    function onMouseDown(e) {
        const resizeHandle = e.target.closest('.resize-handle');
        const itemBar = e.target.closest('.item-bar');

        if (resizeHandle) {
            e.preventDefault();
            e.stopPropagation();
            Tooltip.hide();
            startResize(resizeHandle, e);
            return;
        }

        if (itemBar && !e.target.closest('.resize-handle')) {
            // Click to select
            const itemId = itemBar.dataset.itemId;
            selectedItemId = itemId;
            setSelectedItem(itemId);
            switchToItemsTab();
            State.emit('item:select', itemId);

            // Start drag on mousedown (will only activate after threshold)
            e.preventDefault();
            Tooltip.hide();
            startDrag(itemBar, e);
        }
    }

    function startDrag(bar, e) {
        const grid = document.getElementById('roadmap-grid');
        if (!grid) return;
        const gridRect = grid.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();

        dragState = {
            type: 'move',
            itemId: bar.dataset.itemId,
            segIdx: parseInt(bar.dataset.segmentIndex, 10),
            startX: e.clientX,
            startY: e.clientY,
            offsetX: e.clientX - barRect.left,
            offsetY: e.clientY - barRect.top,
            gridLeft: gridRect.left + container.scrollLeft,
            gridTop: gridRect.top + container.scrollTop,
            bar,
            moved: false,
            originalLeft: bar.offsetLeft,
            originalTop: bar.offsetTop
        };
    }

    function startResize(handle, e) {
        const bar = handle.closest('.item-bar');
        if (!bar) return;
        const grid = document.getElementById('roadmap-grid');
        if (!grid) return;
        const gridRect = grid.getBoundingClientRect();

        dragState = {
            type: 'resize',
            side: handle.dataset.side,
            itemId: handle.dataset.itemId,
            segIdx: parseInt(handle.dataset.segmentIndex, 10),
            startX: e.clientX,
            bar,
            gridLeft: gridRect.left + container.scrollLeft,
            moved: false,
            originalLeft: bar.offsetLeft,
            originalWidth: bar.offsetWidth
        };

        bar.classList.add('dragging');
    }

    function onMouseMove(e) {
        if (!dragState) return;

        const dx = e.clientX - dragState.startX;
        const dy = dragState.startY ? e.clientY - dragState.startY : 0;

        if (!dragState.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        dragState.moved = true;

        const halfCol = colWidth / 2;

        if (dragState.type === 'move') {
            dragState.bar.classList.add('dragging');
            const newLeft = dragState.originalLeft + dx;
            const newTop = dragState.originalTop + dy;
            dragState.bar.style.left = newLeft + 'px';
            dragState.bar.style.top = newTop + 'px';
            dragState.bar.style.zIndex = '100';
            dragState.bar.style.opacity = '0.85';
        } else if (dragState.type === 'resize') {
            if (dragState.side === 'right') {
                const newWidth = Math.max(halfCol, dragState.originalWidth + dx);
                dragState.bar.style.width = newWidth + 'px';
            } else {
                const newLeft = dragState.originalLeft + dx;
                const newWidth = dragState.originalWidth - dx;
                if (newWidth >= halfCol) {
                    dragState.bar.style.left = newLeft + 'px';
                    dragState.bar.style.width = newWidth + 'px';
                }
            }
        }
    }

    function snapToHalf(pixelPos) {
        // Snap to nearest half-column boundary
        const halfCol = colWidth / 2;
        return Math.round(pixelPos / halfCol) * halfCol;
    }

    function pixelToSprintHalf(px) {
        // Convert pixel position to sprint number + half flag
        const halfCol = colWidth / 2;
        const halfIdx = Math.round(px / halfCol);
        const sprintIdx = Math.floor(halfIdx / 2);
        const isHalf = (halfIdx % 2) === 1;
        return { sprintIdx, isHalf };
    }

    function onMouseUp(e) {
        if (!dragState) return;

        const state = dragState;
        dragState = null;

        state.bar.classList.remove('dragging');
        state.bar.style.opacity = '';
        state.bar.style.zIndex = '';

        if (!state.moved) return;

        const minSprint = sprints[0].number;
        const maxSprint = sprints[sprints.length - 1].number;
        const item = State.getItems().find(i => i.id === state.itemId);
        if (!item) return;

        const seg = item.segments[state.segIdx];
        if (!seg) return;

        const halfCol = colWidth / 2;

        if (state.type === 'move') {
            const barLeft = parseFloat(state.bar.style.left);
            // Calculate the current span in half-units to preserve it
            const startOffset = seg.startHalf ? 0.5 : 0;
            const endOffset = seg.endHalf ? -0.5 : 0;
            const currentSpan = seg.sprintEnd - seg.sprintStart + 1 + endOffset - startOffset;
            const spanHalves = Math.round(currentSpan * 2);

            // Snap start to half-column grid
            const snappedLeft = snapToHalf(barLeft);
            const startInfo = pixelToSprintHalf(snappedLeft);
            let newStartIdx = startInfo.sprintIdx;
            let newStartHalf = startInfo.isHalf;

            // Clamp start
            if (newStartIdx < 0) { newStartIdx = 0; newStartHalf = false; }

            const newSprintStart = minSprint + newStartIdx;

            // Calculate end from preserved span
            const endHalves = (newStartIdx * 2 + (newStartHalf ? 1 : 0)) + spanHalves - 1;
            const endSprintIdx = Math.floor(endHalves / 2);
            const newEndHalf = (endHalves % 2) === 0; // endHalf means ends at middle
            const newSprintEnd = minSprint + endSprintIdx;

            if (newSprintEnd <= maxSprint) {
                const intOffset = newSprintStart - seg.sprintStart;
                seg.sprintStart = newSprintStart;
                seg.sprintEnd = newSprintEnd;
                seg.startHalf = newStartHalf;
                seg.endHalf = newEndHalf;
                // Shift delays with the segment
                (seg.delays || []).forEach(d => {
                    d.delaySprintStart = Math.max(newSprintStart, Math.min(newSprintEnd, d.delaySprintStart + intOffset));
                    d.delaySprintEnd = Math.max(newSprintStart, Math.min(newSprintEnd, d.delaySprintEnd + intOffset));
                });
                State.updateItem(state.itemId, { segments: item.segments });
            } else {
                render();
            }
        } else if (state.type === 'resize') {
            const barLeft = parseFloat(state.bar.style.left);
            const barWidth = parseFloat(state.bar.style.width);

            if (state.side === 'left') {
                const snappedLeft = snapToHalf(barLeft);
                const startInfo = pixelToSprintHalf(snappedLeft);
                let newStartIdx = Math.max(0, startInfo.sprintIdx);
                const newStartHalf = startInfo.sprintIdx >= 0 ? startInfo.isHalf : false;
                const newSprintStart = minSprint + newStartIdx;
                const effEnd = seg.sprintEnd + (seg.endHalf ? -0.5 : 0);
                const effNewStart = newSprintStart + (newStartHalf ? 0.5 : 0);
                if (effNewStart <= effEnd) {
                    seg.sprintStart = newSprintStart;
                    seg.startHalf = newStartHalf;
                    State.updateItem(state.itemId, { segments: item.segments });
                } else {
                    render();
                }
            } else {
                const snappedRight = snapToHalf(barLeft + barWidth);
                // Right edge: snappedRight is the pixel position of the right edge
                // Convert to sprint end + endHalf
                const rightHalves = Math.round(snappedRight / halfCol) - 1;
                const endSprintIdx = Math.floor(Math.max(0, rightHalves) / 2);
                const isEndHalf = rightHalves >= 0 && (rightHalves % 2) === 0;
                const newSprintEnd = minSprint + Math.min(sprints.length - 1, endSprintIdx);
                const effStart = seg.sprintStart + (seg.startHalf ? 0.5 : 0);
                const effEnd = newSprintEnd + (isEndHalf ? -0.5 : 0);
                if (effEnd >= effStart) {
                    seg.sprintEnd = newSprintEnd;
                    seg.endHalf = isEndHalf;
                    State.updateItem(state.itemId, { segments: item.segments });
                } else {
                    render();
                }
            }
        }
    }

    function renderLegend() {
        const legendEl = document.getElementById('roadmap-legend');
        if (!legendEl) return;

        const itemTypes = State.getItemTypes();
        const statusTypes = State.getStatusTypes();

        let html = '';
        itemTypes.forEach(t => {
            const textColor = State.getContrastColor(t.color);
            html += `<span class="legend-chip" style="background:${t.color}; color:${textColor};">${escapeHtml(t.label)}</span>`;
        });

        html += '<span class="legend-chip legend-chip-outline intruder-chip">Intruder</span>';
        statusTypes.forEach(s => {
            if (s.value !== '' && s.icon) {
                html += `<span class="legend-chip legend-chip-status"><span class="status-icon">${escapeHtml(s.icon)}</span> ${escapeHtml(s.label)}</span>`;
            }
        });
        html += '<span class="legend-chip legend-chip-delay">Delay</span>';

        legendEl.innerHTML = html;
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

    function getSprints() { return sprints; }
    function getColWidth() { return colWidth; }

    return { init, render, getSprints, getColWidth, setSelectedItem };
})();
