const Engine = (() => {
    const MAX_SPRINTS = 200;

    // Vertical layout constants (px). Shared by the renderer and the tests.
    const ROW_H = 52;            // height of one track (bar + spacing)
    const BAR_OFFSET = 8;        // bar top offset inside its track
    const BAR_H = 40;            // bar height (mirrors .item-bar in CSS)
    const LANE_HEADER_H = 30;    // lane header row
    const LANE_GAP = 8;          // spacing below a lane's last track
    const COLLAPSED_H = LANE_HEADER_H + 14;   // header + mini-bar strip
    const MIN_TRACKS_FLAT = 3;   // min tracks when there are no lanes (legacy look)

    // Implicit lane that receives items without a (valid) laneId.
    const UNASSIGNED_LANE = { id: '', name: 'Sem trilha', color: '#64748b', description: '' };

    function calculateSprints(config) {
        const sprints = [];
        const start = new Date(config.dataInicio + 'T00:00:00');
        const end = new Date(config.dataFim + 'T00:00:00');
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return sprints;
        // Guard against non-positive day counts (would cause an infinite loop).
        const days = Math.max(1, parseInt(config.diasSprint, 10) || 14);
        let num = parseInt(config.sprintStartNumber, 10) || 1;
        let cur = new Date(start);

        while (cur <= end && sprints.length < MAX_SPRINTS) {
            const sprintEnd = new Date(cur);
            sprintEnd.setDate(sprintEnd.getDate() + days - 1);
            sprints.push({
                number: num,
                startDate: new Date(cur),
                endDate: sprintEnd > end ? new Date(end) : sprintEnd
            });
            num++;
            cur.setDate(cur.getDate() + days);
        }
        return sprints;
    }

    function calculateMonthBands(sprints) {
        if (!sprints.length) return [];
        const bands = [];
        let current = null;

        sprints.forEach((s, i) => {
            const mid = new Date(s.startDate);
            mid.setDate(mid.getDate() + Math.floor((s.endDate - s.startDate) / 86400000 / 2));
            const monthKey = `${mid.getFullYear()}-${mid.getMonth()}`;
            const monthName = mid.toLocaleString('pt-BR', { month: 'long' });
            const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);

            if (current && current.key === monthKey) {
                current.spanCount++;
            } else {
                current = { key: monthKey, label, startIndex: i, spanCount: 1 };
                bands.push(current);
            }
        });
        return bands;
    }

    function segEffectiveStart(seg) {
        return seg.sprintStart + (seg.startHalf ? 0.5 : 0);
    }

    function segEffectiveEnd(seg) {
        return seg.sprintEnd + (seg.endHalf ? -0.5 : 0);
    }

    // Effective [start, end] of an item across all its segments (sprint units,
    // half-sprint precision). `end` is inclusive: the bar's right edge is end + 1.
    function itemRange(item) {
        let start = Infinity, end = -Infinity;
        (item.segments || []).forEach(seg => {
            const s = segEffectiveStart(seg);
            const e = segEffectiveEnd(seg);
            if (s < start) start = s;
            if (e > end) end = e;
        });
        return { start, end };
    }

    function allocateTracks(items, sprints) {
        if (!sprints.length || !items.length) return [];

        const sprintNumbers = sprints.map(s => s.number);
        const minSprint = sprintNumbers[0];
        const maxSprint = sprintNumbers[sprintNumbers.length - 1];

        const entries = items.map(item => {
            let globalStart = Infinity, globalEnd = -Infinity;
            item.segments.forEach(seg => {
                const ss = Math.max(segEffectiveStart(seg), minSprint);
                const se = Math.min(segEffectiveEnd(seg), maxSprint);
                if (ss < globalStart) globalStart = ss;
                if (se > globalEnd) globalEnd = se;
            });
            return { item, globalStart, globalEnd };
        });

        const tracks = [];

        entries.forEach(entry => {
            let placed = false;
            for (let t = 0; t < tracks.length; t++) {
                const canPlace = entry.item.segments.every(seg => {
                    const ss = Math.max(segEffectiveStart(seg), minSprint);
                    const se = Math.min(segEffectiveEnd(seg), maxSprint);
                    return tracks[t].every(occ => occ.end < ss || occ.start > se);
                });
                if (canPlace) {
                    entry.item.segments.forEach(seg => {
                        tracks[t].push({
                            start: Math.max(segEffectiveStart(seg), minSprint),
                            end: Math.min(segEffectiveEnd(seg), maxSprint)
                        });
                    });
                    entry.track = t;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                const t = tracks.length;
                tracks.push([]);
                entry.item.segments.forEach(seg => {
                    tracks[t].push({
                        start: Math.max(segEffectiveStart(seg), minSprint),
                        end: Math.min(segEffectiveEnd(seg), maxSprint)
                    });
                });
                entry.track = t;
            }
        });

        return entries.map(e => ({ item: e.item, track: e.track }));
    }

    function clampSegments(items, sprints) {
        if (!sprints.length) return items;
        const min = sprints[0].number;
        const max = sprints[sprints.length - 1].number;

        return items.map(item => ({
            ...item,
            segments: item.segments.map(seg => {
                let ss = Math.max(min, Math.min(max, seg.sprintStart));
                let se = Math.max(ss, Math.min(max, seg.sprintEnd));
                let sh = !!seg.startHalf;
                let eh = !!seg.endHalf;
                // If clamped to min, can't start at half if sprint was pushed
                if (seg.sprintStart < min) sh = false;
                if (seg.sprintEnd > max) eh = false;
                return {
                    ...seg,
                    sprintStart: ss,
                    sprintEnd: se,
                    startHalf: sh,
                    endHalf: eh,
                    delays: (seg.delays || []).map(d => ({
                        delaySprintStart: Math.max(ss, Math.min(se, d.delaySprintStart)),
                        delaySprintEnd: Math.max(ss, Math.min(se, d.delaySprintEnd))
                    }))
                };
            })
        }));
    }

    function formatDateShort(date) {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${d}/${m}`;
    }

    function getCurrentSprintIndex(sprints, refDate) {
        if (!sprints.length) return -1;
        const ref = refDate instanceof Date ? refDate : new Date();
        const t = ref.getTime();
        for (let i = 0; i < sprints.length; i++) {
            const startMs = sprints[i].startDate.getTime();
            const endMs = sprints[i].endDate.getTime() + 86399999;
            if (t >= startMs && t <= endMs) return i;
        }
        return -1;
    }

    // ─── Filters ─────────────────────────────────────────
    // filters: { laneId, type, status, memberId, health, confidence, search }
    // '' (or undefined) = no filter; '__none__' = "unassigned" for lane/member/health.
    function matchesChoice(value, filter) {
        if (filter === undefined || filter === null || filter === '') return true;
        if (filter === '__none__') return !value;
        return value === filter;
    }

    function filterItems(items, filters) {
        if (!filters) return items;
        const q = (filters.search || '').trim().toLowerCase();
        return items.filter(it => {
            if (!matchesChoice(it.laneId || '', filters.laneId)) return false;
            if (!matchesChoice(it.type || '', filters.type)) return false;
            if (!matchesChoice(it.status || '', filters.status)) return false;
            if (!matchesChoice(it.responsavel || '', filters.memberId)) return false;
            if (!matchesChoice(it.health || '', filters.health)) return false;
            if (!matchesChoice(it.confidence || '', filters.confidence)) return false;
            if (q) {
                const hay = [it.title, it.observacao, it.outcome].filter(Boolean).join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }

    function isFilterActive(filters) {
        if (!filters) return false;
        return Object.keys(filters).some(k => {
            const v = filters[k];
            return v !== undefined && v !== null && String(v).trim() !== '';
        });
    }

    // ─── Lane layout ─────────────────────────────────────
    // Returns { lanes: [{ lane, entries, trackCount, top, barTop, height, collapsed, implicit, showHeader }], totalHeight, hasLanes }.
    // Items whose laneId doesn't match a configured lane fall into the implicit
    // "Sem trilha" lane, rendered last and only when non-empty. With no lanes
    // configured at all, the layout is flat (no header) — the legacy look.
    function computeLayout(items, sprints, lanes, collapsedIds) {
        const laneDefs = Array.isArray(lanes) ? lanes : [];
        const collapsed = new Set(collapsedIds || []);
        const hasLanes = laneDefs.length > 0;

        const groups = new Map();
        laneDefs.forEach(l => groups.set(l.id, []));
        const unassigned = [];
        (items || []).forEach(it => {
            const bucket = groups.get(it.laneId);
            if (bucket) bucket.push(it); else unassigned.push(it);
        });

        const ordered = laneDefs.map(l => ({ lane: l, items: groups.get(l.id), implicit: false }));
        if (unassigned.length || !hasLanes) {
            ordered.push({ lane: UNASSIGNED_LANE, items: unassigned, implicit: true });
        }

        let top = 0;
        const out = ordered.map(g => {
            const showHeader = hasLanes;
            const isCollapsed = showHeader && collapsed.has(g.lane.id);
            const entries = allocateTracks(g.items, sprints);
            const trackCount = entries.length ? Math.max(...entries.map(e => e.track)) + 1 : 0;
            let height;
            if (!showHeader) {
                height = Math.max(trackCount, MIN_TRACKS_FLAT) * ROW_H + 16;
            } else if (isCollapsed) {
                height = COLLAPSED_H;
            } else {
                height = LANE_HEADER_H + Math.max(trackCount, 1) * ROW_H + LANE_GAP;
            }
            const laneOut = {
                lane: g.lane,
                entries,
                trackCount,
                top,
                barTop: top + (showHeader ? LANE_HEADER_H : 0),
                height,
                collapsed: isCollapsed,
                implicit: g.implicit,
                showHeader
            };
            top += height;
            return laneOut;
        });

        return { lanes: out, totalHeight: top, hasLanes };
    }

    // Lane id under a grid-relative y. '' = implicit lane, undefined = outside.
    function laneAtY(layout, y) {
        if (!layout || !Number.isFinite(y)) return undefined;
        for (const l of layout.lanes) {
            if (y >= l.top && y < l.top + l.height) return l.lane.id;
        }
        return undefined;
    }

    // Grid-relative y of a bar's top edge for a placed entry.
    function barTopFor(laneOut, track) {
        return laneOut.barTop + track * ROW_H + BAR_OFFSET;
    }

    // ─── Dependencies ────────────────────────────────────
    // Edges between visible bars. Endpoints not in the layout (filtered out,
    // collapsed lane, unknown id) are skipped so stale data never throws.
    function computeDependencyEdges(items, layout, colWidth, minSprint) {
        if (!layout || !colWidth) return [];
        const placed = new Map();
        layout.lanes.forEach(l => {
            if (l.collapsed) return;
            l.entries.forEach(e => placed.set(e.item.id, { item: e.item, y: barTopFor(l, e.track) + BAR_H / 2 }));
        });

        const edges = [];
        (items || []).forEach(succ => {
            const to = placed.get(succ.id);
            if (!to) return;
            (succ.dependsOn || []).forEach(predId => {
                const from = placed.get(predId);
                if (!from) return;
                const fr = itemRange(from.item);
                const tr = itemRange(succ);
                if (!Number.isFinite(fr.end) || !Number.isFinite(tr.start)) return;
                edges.push({
                    fromId: predId,
                    toId: succ.id,
                    x1: (fr.end + 1 - minSprint) * colWidth,
                    y1: from.y,
                    x2: (tr.start - minSprint) * colWidth,
                    y2: to.y,
                    conflict: tr.start < fr.end + 1
                });
            });
        });
        return edges;
    }

    // True when `item` starts before any of its predecessors ends.
    function hasDependencyConflict(item, itemsById) {
        const tr = itemRange(item);
        if (!Number.isFinite(tr.start)) return false;
        return (item.dependsOn || []).some(id => {
            const pred = itemsById.get ? itemsById.get(id) : itemsById[id];
            if (!pred) return false;
            const fr = itemRange(pred);
            return Number.isFinite(fr.end) && tr.start < fr.end + 1;
        });
    }

    // ─── Completion, buckets, summary ────────────────────
    function isDone(item, statusTypes) {
        if ((parseInt(item.progress, 10) || 0) >= 100) return true;
        const st = (statusTypes || []).find(s => s.value === item.status);
        return !!(st && st.done);
    }

    // Resolves the reference sprint. Returns { cur, before } where cur is the
    // current sprint number (null when outside the period) and before tells
    // whether the reference date precedes the period.
    function referenceSprint(sprints, refDate) {
        if (!sprints.length) return { cur: null, before: true };
        const idx = getCurrentSprintIndex(sprints, refDate);
        if (idx >= 0) return { cur: sprints[idx].number, before: false };
        const ref = refDate instanceof Date ? refDate : new Date();
        return { cur: null, before: ref.getTime() < sprints[0].startDate.getTime() };
    }

    // Now / Next / Later / Done. Derived only from the timeline, no extra data.
    // now   = touches the current sprint, or ended before it without being done (late)
    // next  = starts within the next two sprints
    // later = everything else
    function bucketNowNextLater(items, sprints, refDate, statusTypes) {
        const out = { done: [], now: [], next: [], later: [] };
        const { cur, before } = referenceSprint(sprints, refDate);
        (items || []).forEach(it => {
            if (isDone(it, statusTypes)) { out.done.push(it); return; }
            const r = itemRange(it);
            if (!Number.isFinite(r.start)) { out.later.push(it); return; }
            if (cur === null) { (before ? out.later : out.now).push(it); return; }
            if (r.start < cur + 1 && r.end >= cur) out.now.push(it);
            else if (r.end < cur) out.now.push(it);
            else if (r.start < cur + 3) out.next.push(it);
            else out.later.push(it);
        });
        return out;
    }

    function computeSummary(items, sprints, refDate, statusTypes) {
        const list = items || [];
        const { cur, before } = referenceSprint(sprints, refDate);
        let done = 0, inCurrent = 0, atRisk = 0, tentative = 0, overdue = 0;
        list.forEach(it => {
            const d = isDone(it, statusTypes);
            if (d) done++;
            if (it.health === 'red') atRisk++;
            if (it.confidence === 'low') tentative++;
            const r = itemRange(it);
            if (!Number.isFinite(r.start)) return;
            if (cur !== null) {
                if (r.start < cur + 1 && r.end >= cur) inCurrent++;
                if (!d && r.end < cur) overdue++;
            } else if (!before && !d) {
                overdue++;
            }
        });
        return {
            total: list.length,
            done,
            donePct: list.length ? Math.round((done / list.length) * 100) : 0,
            inCurrent,
            atRisk,
            tentative,
            overdue,
            hasCurrent: cur !== null
        };
    }

    return {
        ROW_H, BAR_OFFSET, BAR_H, LANE_HEADER_H, LANE_GAP, COLLAPSED_H, UNASSIGNED_LANE,
        calculateSprints, calculateMonthBands, allocateTracks, clampSegments, formatDateShort,
        segEffectiveStart, segEffectiveEnd, itemRange, getCurrentSprintIndex,
        filterItems, isFilterActive,
        computeLayout, laneAtY, barTopFor,
        computeDependencyEdges, hasDependencyConflict,
        isDone, bucketNowNextLater, computeSummary
    };
})();
