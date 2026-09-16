// Runs with the built-in test runner: `node --test test/`
// engine.js is a browser IIFE that assigns a global; evaluate it in this realm
// (a separate vm context would break `instanceof Date` and deep-equal on arrays).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'engine.js'), 'utf8');
const Engine = vm.runInThisContext(source + '\nEngine;', { filename: 'engine.js' });

const config = { dataInicio: '2026-01-05', dataFim: '2026-03-01', diasSprint: 14, sprintStartNumber: 1 };
const sprints = Engine.calculateSprints(config);   // sprints 1..4 (Jan 5 – Mar 1)
const STATUS = [
    { value: '', label: 'Nenhum', done: false },
    { value: 'Finalizado', label: 'Finalizado', done: true }
];

function item(id, start, end, extra) {
    return {
        id, title: id, type: 'EV', laneId: '', status: '', progress: 0, health: '', confidence: 'high',
        dependsOn: [], links: [], segments: [{ sprintStart: start, sprintEnd: end, startHalf: false, endHalf: false, delays: [] }],
        ...(extra || {})
    };
}

test('calculateSprints builds 4 fortnightly sprints', () => {
    assert.equal(sprints.length, 4);
    assert.equal(sprints[0].number, 1);
    assert.equal(sprints[3].number, 4);
});

test('filterItems: empty filter keeps everything; __none__ means unassigned; search matches title', () => {
    const items = [item('a', 1, 1, { laneId: 'L1', title: 'Login' }), item('b', 1, 1, { title: 'Checkout' })];
    assert.equal(Engine.filterItems(items, null).length, 2);
    assert.equal(Engine.filterItems(items, { laneId: '' }).length, 2);
    assert.deepEqual(Engine.filterItems(items, { laneId: 'L1' }).map(i => i.id), ['a']);
    assert.deepEqual(Engine.filterItems(items, { laneId: '__none__' }).map(i => i.id), ['b']);
    assert.deepEqual(Engine.filterItems(items, { search: 'check' }).map(i => i.id), ['b']);
    assert.equal(Engine.isFilterActive({ laneId: '', search: '' }), false);
    assert.equal(Engine.isFilterActive({ laneId: 'L1' }), true);
});

test('computeLayout: no lanes → flat headerless layout', () => {
    const items = [item('a', 1, 2), item('b', 1, 2)];
    const layout = Engine.computeLayout(items, sprints, [], []);
    assert.equal(layout.hasLanes, false);
    assert.equal(layout.lanes.length, 1);
    assert.equal(layout.lanes[0].showHeader, false);
    assert.equal(layout.lanes[0].trackCount, 2);
    assert.equal(layout.lanes[0].barTop, 0);
    assert.equal(layout.totalHeight, 3 * Engine.ROW_H + 16);
});

test('computeLayout: lanes in order, implicit "Sem trilha" only when needed, unknown laneId goes there', () => {
    const lanes = [{ id: 'L1', name: 'Um', color: '#000000' }, { id: 'L2', name: 'Dois', color: '#000000' }];
    const a = item('a', 1, 1, { laneId: 'L2' });
    const b = item('b', 1, 1, { laneId: 'L1' });
    let layout = Engine.computeLayout([a, b], sprints, lanes, []);
    assert.deepEqual(layout.lanes.map(l => l.lane.id), ['L1', 'L2']);
    assert.equal(layout.lanes[0].top, 0);
    assert.equal(layout.lanes[0].barTop, Engine.LANE_HEADER_H);
    assert.equal(layout.lanes[1].top, layout.lanes[0].height);

    const c = item('c', 1, 1, { laneId: 'ghost' });
    layout = Engine.computeLayout([a, b, c], sprints, lanes, []);
    assert.deepEqual(layout.lanes.map(l => l.lane.id), ['L1', 'L2', '']);
    assert.equal(layout.lanes[2].implicit, true);
    assert.equal(layout.lanes[2].entries[0].item.id, 'c');

    // Empty configured lane still shows (one empty track); collapsed lane is short.
    layout = Engine.computeLayout([b], sprints, lanes, ['L2']);
    assert.equal(layout.lanes[1].collapsed, true);
    assert.equal(layout.lanes[1].height, Engine.COLLAPSED_H);
    assert.equal(layout.lanes[0].height, Engine.LANE_HEADER_H + Engine.ROW_H + Engine.LANE_GAP);
});

test('laneAtY: lane id inside, "" for implicit lane, undefined outside', () => {
    const lanes = [{ id: 'L1', name: 'Um', color: '#000000' }];
    const layout = Engine.computeLayout([item('a', 1, 1, { laneId: 'L1' }), item('b', 1, 1)], sprints, lanes, []);
    assert.equal(Engine.laneAtY(layout, 5), 'L1');
    assert.equal(Engine.laneAtY(layout, layout.lanes[1].top + 5), '');
    assert.equal(Engine.laneAtY(layout, layout.totalHeight + 10), undefined);
    assert.equal(Engine.laneAtY(layout, -1), undefined);
});

test('computeDependencyEdges: geometry, conflict flag and skipped endpoints', () => {
    const pred = item('p', 1, 2);
    const okSucc = item('s1', 3, 3, { dependsOn: ['p'] });
    const badSucc = item('s2', 2, 3, { dependsOn: ['p'] });
    const orphan = item('s3', 3, 3, { dependsOn: ['missing'] });
    const items = [pred, okSucc, badSucc, orphan];
    const layout = Engine.computeLayout(items, sprints, [], []);
    const edges = Engine.computeDependencyEdges(items, layout, 100, 1);
    assert.equal(edges.length, 2);
    const e1 = edges.find(e => e.toId === 's1');
    const e2 = edges.find(e => e.toId === 's2');
    assert.equal(e1.conflict, false);
    assert.equal(e1.x1, 200);   // pred ends sprint 2 → right edge at (2 + 1 - 1) * 100
    assert.equal(e1.x2, 200);   // s1 starts sprint 3 → (3 - 1) * 100
    assert.equal(e2.conflict, true);

    // Collapsed lane hides the edge.
    const lanes = [{ id: 'L1', name: 'Um', color: '#000000' }];
    const p2 = item('p', 1, 2, { laneId: 'L1' });
    const layout2 = Engine.computeLayout([p2, okSucc], sprints, lanes, ['L1']);
    assert.equal(Engine.computeDependencyEdges([p2, okSucc], layout2, 100, 1).length, 0);

    const byId = new Map(items.map(i => [i.id, i]));
    assert.equal(Engine.hasDependencyConflict(badSucc, byId), true);
    assert.equal(Engine.hasDependencyConflict(okSucc, byId), false);
});

test('bucketNowNextLater: done / now (incl. late) / next / later', () => {
    const ref = new Date('2026-02-05T12:00:00');  // inside sprint 3 (Feb 2 – Feb 15)
    const items = [
        item('done-status', 1, 1, { status: 'Finalizado' }),
        item('done-progress', 4, 4, { progress: 100 }),
        item('late', 1, 2),
        item('current', 2, 3),
        item('next', 4, 4),
        item('later', 4, 4, { segments: [{ sprintStart: 9, sprintEnd: 9, delays: [] }] })
    ];
    const b = Engine.bucketNowNextLater(items, sprints, ref, STATUS);
    assert.deepEqual(b.done.map(i => i.id).sort(), ['done-progress', 'done-status']);
    assert.deepEqual(b.now.map(i => i.id).sort(), ['current', 'late']);
    assert.deepEqual(b.next.map(i => i.id), ['next']);
    assert.deepEqual(b.later.map(i => i.id), ['later']);
});

test('bucketNowNextLater outside the period: before → later, after → now', () => {
    const items = [item('a', 2, 2)];
    const before = Engine.bucketNowNextLater(items, sprints, new Date('2025-06-01T12:00:00'), STATUS);
    assert.deepEqual(before.later.map(i => i.id), ['a']);
    const after = Engine.bucketNowNextLater(items, sprints, new Date('2027-06-01T12:00:00'), STATUS);
    assert.deepEqual(after.now.map(i => i.id), ['a']);
});

test('computeSummary counts', () => {
    const ref = new Date('2026-02-05T12:00:00');  // sprint 3
    const items = [
        item('a', 1, 1, { status: 'Finalizado' }),
        item('b', 1, 2, { health: 'red' }),          // overdue + at risk
        item('c', 3, 4, { confidence: 'low' }),      // in current + tentative
        item('d', 4, 4)
    ];
    const s = Engine.computeSummary(items, sprints, ref, STATUS);
    assert.equal(s.total, 4);
    assert.equal(s.done, 1);
    assert.equal(s.donePct, 25);
    assert.equal(s.inCurrent, 1);
    assert.equal(s.atRisk, 1);
    assert.equal(s.tentative, 1);
    assert.equal(s.overdue, 1);
    assert.equal(s.hasCurrent, true);

    const empty = Engine.computeSummary([], sprints, ref, STATUS);
    assert.equal(empty.donePct, 0);
});

test('diffAgainstBaseline: added / removed / moved / completed / changedLane', () => {
    const baseline = [
        item('a', 1, 1),
        item('b', 2, 3),
        item('c', 1, 1, { laneId: 'L1' }),
        item('gone', 4, 4)
    ];
    const now = [
        item('a', 1, 1),                                   // unchanged
        item('b', 3, 4, { status: 'Finalizado' }),          // moved + completed
        item('c', 1, 1, { laneId: 'L2' }),                   // lane changed
        item('new', 2, 2)                                    // added
    ];
    const d = Engine.diffAgainstBaseline(now, baseline, STATUS);
    assert.deepEqual(d.added.map(i => i.id), ['new']);
    assert.deepEqual(d.removed.map(i => i.id), ['gone']);
    assert.deepEqual(d.moved.map(m => [m.item.id, m.from.start, m.from.end, m.to.start, m.to.end]), [['b', 2, 3, 3, 4]]);
    assert.deepEqual(d.completed.map(i => i.id), ['b']);
    assert.deepEqual(d.changedLane.map(c => [c.item.id, c.fromLaneId, c.toLaneId]), [['c', 'L1', 'L2']]);
    assert.equal(d.unchanged, 1);
});
