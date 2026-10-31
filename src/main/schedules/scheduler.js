import { CronExpressionParser } from 'cron-parser';
import { workspaceRepository as repo } from '../repositories/workspace.js';
import { sendEndpointRequest } from '../http/endpointClient.js';

const MAX_DELAY_MS = 2147483647;
const running = new Set();
let timer = null;
let notifyProgress = () => {};
export function setRunProgressNotifier(notifier) { notifyProgress = notifier; }

export function nextRunFor(cron, from = new Date()) {
    if (String(cron || '').trim().split(/\s+/).length !== 5) throw new Error('Invalid cron expression. Use five fields.');
    try { return CronExpressionParser.parse(cron, { currentDate: from }).next().toDate().toISOString(); }
    catch { throw new Error('Invalid cron expression. Use five fields.'); }
}

export function normalizeDelay(value) {
    if (value === undefined || value === null) return 0;
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') throw new Error('Delay must be a whole number between 0 and 2147483647 milliseconds.');
    const delay = Number(value);
    if (!Number.isInteger(delay) || delay < 0 || delay > MAX_DELAY_MS) throw new Error('Delay must be a whole number between 0 and 2147483647 milliseconds.');
    return delay;
}

// Build a directed acyclic graph, then keep only nodes reachable from Start through enabled endpoints.
export function buildExecutionPlan(flow, endpoints, collection) {
    const nodes = Array.isArray(flow?.nodes) ? flow.nodes : [];
    const edges = Array.isArray(flow?.edges) ? flow.edges : [];
    const known = new Set(nodes.map(node => String(node.id)));
    if (!known.has('start')) return { ids: [], parents: new Map() };
    const outgoing = new Map([...known].map(id => [id, []]));
    const indegree = new Map([...known].map(id => [id, 0]));
    const pairs = new Set();
    for (const edge of edges) {
        const source = String(edge.source), target = String(edge.target);
        if (!known.has(source) || !known.has(target)) continue;
        const pair = JSON.stringify([source, target]);
        if (target === 'start' || source === target || pairs.has(pair)) throw new Error('The flow contains an invalid connection.');
        pairs.add(pair);
        outgoing.get(source).push(target);
        indegree.set(target, indegree.get(target) + 1);
    }
    const ready = [...known].filter(id => indegree.get(id) === 0);
    let count = 0;
    while (ready.length) {
        const id = ready.shift(); count += 1;
        for (const target of outgoing.get(id)) {
            indegree.set(target, indegree.get(target) - 1);
            if (indegree.get(target) === 0) ready.push(target);
        }
    }
    if (count !== known.size) throw new Error('The flow contains a cycle.');
    const enabled = new Set(endpoints.filter(item => item.enabled && item.collection === collection).map(item => item.id));
    const reachable = new Set(['start']);
    const queue = ['start'];
    while (queue.length) {
        const id = queue.shift();
        for (const target of outgoing.get(id)) {
            if (enabled.has(target) && !reachable.has(target)) { reachable.add(target); queue.push(target); }
        }
    }
    const ids = [...reachable].filter(id => id !== 'start');
    const parents = new Map(ids.map(id => [id, []]));
    for (const source of reachable) {
        for (const target of outgoing.get(source)) {
            if (parents.has(target)) parents.get(target).push(source);
        }
    }
    return { ids, parents };
}

export function prepareSchedule(payload) {
    const nextRun = payload.enabled ? nextRunFor(payload.cron) : (nextRunFor(payload.cron), null);
    if (!String(payload.name || '').trim()) throw new Error('Schedule name is required.');
    if (payload.taskType === 'single') {
        if (!repo.listEndpoints().some(item => item.id === payload.endpointId && item.enabled)) throw new Error('Select an enabled endpoint.');
    } else if (payload.taskType === 'collection') {
        if (!payload.collection) throw new Error('Select a collection.');
        for (const node of payload.flow?.nodes || []) if (node.id !== 'start') normalizeDelay(node.delayMs);
        if (!buildExecutionPlan(payload.flow, repo.listEndpoints(), payload.collection).ids.length) throw new Error('Connect at least one enabled endpoint to Start.');
    } else throw new Error('Select a task type.');
    return { ...payload, nextRun };
}

export async function runSchedule(id, triggeredBy = 'manual') {
    if (running.has(id)) throw new Error('This schedule is already running.');
    const schedule = repo.listSchedules().find(item => item.id === id);
    if (!schedule) throw new Error('Schedule not found.');
    if (schedule.taskType === 'legacy') throw new Error('Edit and save this legacy schedule before running it.');
    running.add(id);
    const startedAt = new Date().toISOString();
    const started = Date.now();
    const nodeResults = [];
    let flowSnapshot = {};
    let run;
    const publish = (patch = {}) => {
        if (!run) return;
        run = repo.updateRun(run.id, { ...patch, nodeResults });
        if (run) notifyProgress(run);
    };
    const setNode = (endpointId, patch) => {
        const index = nodeResults.findIndex(node => node.endpointId === endpointId);
        if (index >= 0) nodeResults[index] = { ...nodeResults[index], ...patch };
        publish();
    };
    try {
        const endpoints = repo.listEndpoints();
        if (schedule.taskType === 'collection') {
            const eligible = new Map(endpoints.filter(item => item.enabled && item.collection === schedule.collection).map(item => [item.id, item]));
            const nodes = (schedule.flow?.nodes || []).filter(node => node.id === 'start' || eligible.has(node.id)).map(node => {
                const endpoint = eligible.get(node.id);
                return { id: node.id, position: node.position, name: endpoint?.name || '', method: endpoint?.method || '', delayMs: node.id === 'start' ? 0 : normalizeDelay(node.delayMs) };
            });
            const ids = new Set(nodes.map(node => node.id));
            flowSnapshot = { nodes, edges: (schedule.flow?.edges || []).filter(edge => ids.has(edge.source) && ids.has(edge.target)).map(({ id, source, target }) => ({ id, source, target })) };
        }
        const plan = schedule.taskType === 'single'
            ? { ids: endpoints.filter(item => item.id === schedule.endpointId && item.enabled).map(item => item.id), parents: new Map([[schedule.endpointId, ['start']]]) }
            : buildExecutionPlan(schedule.flow, endpoints, schedule.collection);
        if (!plan.ids.length) throw new Error('No connected enabled endpoints to execute.');
        const delays = schedule.taskType === 'collection'
            ? new Map((schedule.flow?.nodes || []).map(node => [node.id, normalizeDelay(node.delayMs)])) : new Map();
        for (const endpointId of plan.ids) {
            const endpoint = endpoints.find(item => item.id === endpointId);
            nodeResults.push({ endpointId, name: endpoint?.name || '', method: endpoint?.method || '', status: 'pending' });
        }
        run = repo.createRun({ scheduleId: id, endpointId: schedule.taskType === 'single' ? schedule.endpointId : null, status: 'running', startedAt, triggeredBy, mode: 'live', nodeResults, flowSnapshot });
        notifyProgress(run);
        const promises = new Map();
        const executeNode = (endpointId) => {
            if (endpointId === 'start') return Promise.resolve({ status: 'success' });
            if (promises.has(endpointId)) return promises.get(endpointId);
            const promise = Promise.all((plan.parents.get(endpointId) || []).map(executeNode)).then(async (parents) => {
                if (parents.some(parent => !parent || parent.status !== 'success')) {
                    setNode(endpointId, { status: 'skipped' });
                    return { status: 'skipped' };
                }
                const delay = delays.get(endpointId) || 0;
                if (delay) {
                    setNode(endpointId, { status: 'waiting' });
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                setNode(endpointId, { status: 'running' });
                try {
                    const endpoint = repo.listEndpoints().find(item => item.id === endpointId && item.enabled && (schedule.taskType !== 'collection' || item.collection === schedule.collection));
                    if (!endpoint) throw new Error('An endpoint was disabled or removed during execution.');
                    const result = await sendEndpointRequest(endpoint);
                    const scripts = [result.script?.preRequest, result.script?.postResponse].filter(Boolean);
                    const scriptError = scripts.find(item => item.error || item.tests?.some(test => test.passed === false));
                    const outcome = { status: result.status === 'success' && !scriptError ? 'success' : 'failed', statusCode: result.statusCode, duration: result.duration, response: result.response ?? null, error: result.error || scriptError?.error || scriptError?.tests?.find(test => test.passed === false)?.error || null };
                    setNode(endpointId, outcome);
                    return outcome;
                } catch (exception) {
                    const outcome = { status: 'failed', error: exception.message || String(exception) };
                    setNode(endpointId, outcome);
                    return outcome;
                }
            });
            promises.set(endpointId, promise);
            return promise;
        };
        await Promise.all(plan.ids.map(executeNode));
        const single = schedule.taskType === 'single' ? nodeResults[0] : null;
        publish({ status: nodeResults.some(node => node.status !== 'success') ? 'failed' : 'success', statusCode: single?.statusCode ?? null, response: single?.response ?? null, duration: Date.now() - started });
        return run;
    } catch (exception) {
        const error = exception.message || String(exception);
        if (!run) {
            run = repo.createRun({ scheduleId: id, endpointId: schedule.taskType === 'single' ? schedule.endpointId : null, status: 'failed', startedAt, triggeredBy, mode: 'live', error, duration: Date.now() - started, nodeResults, flowSnapshot });
            notifyProgress(run);
        } else publish({ status: 'failed', error, duration: Date.now() - started });
        return run;
    } finally { running.delete(id); }
}

export function startScheduler() {
    if (timer) return;
    repo.interruptRunningRuns();
    // Legacy schedules were never automatic. They remain inactive until explicitly saved.
    for (const schedule of repo.listSchedules()) {
        if (schedule.taskType === 'legacy' || !schedule.enabled) continue;
        try { repo.updateSchedule(schedule.id, { nextRun: nextRunFor(schedule.cron) }); }
        catch (error) { console.error('Invalid schedule:', schedule.id, error.message); }
    }
    timer = setInterval(() => {
        const now = Date.now();
        for (const schedule of repo.listSchedules()) {
            if (!schedule.enabled || schedule.taskType === 'legacy' || !schedule.nextRun || Date.parse(schedule.nextRun) > now || running.has(schedule.id)) continue;
            try {
                repo.updateSchedule(schedule.id, { nextRun: nextRunFor(schedule.cron) });
                runSchedule(schedule.id, 'schedule').catch(error => console.error('Schedule failed:', schedule.id, error.message));
            } catch (error) { console.error('Schedule failed:', schedule.id, error.message); }
        }
    }, 1000);
}
export function stopScheduler() { if (timer) clearInterval(timer); timer = null; }
