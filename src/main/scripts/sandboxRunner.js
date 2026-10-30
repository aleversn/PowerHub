import Sandbox from 'postman-sandbox';

const DEFAULT_TIMEOUT = 5000;

let contextPromise = null;

// postman-sandbox 的 createContext 回调式 API 在这里包一层 Promise，
// 进程内复用同一个 sandbox 上下文，避免每次请求都重建 VM。
const getSandboxContext = () =>
    new Promise((resolve, reject) => {
        if (contextPromise) return contextPromise.then(resolve).catch(reject);
        contextPromise = new Promise((resolveContext, rejectContext) => {
            Sandbox.createContext((error, context) => {
                if (error) return rejectContext(error);
                resolveContext(context);
            });
        });
        return contextPromise.then(resolve).catch(reject);
    });

const toVariableValues = (source) => {
    if (!source) return [];
    if (Array.isArray(source.values)) {
        return source.values
            .filter((item) => item && item.key !== undefined && item.key !== null)
            .map((item) => ({ key: String(item.key), value: item.value }));
    }
    if (typeof source === 'object') {
        return Object.entries(source)
            .filter(([key]) => key)
            .map(([key, value]) => ({ key, value }));
    }
    return [];
};

const scopeToMap = (source) => {
    const map = {};
    for (const item of toVariableValues(source)) map[item.key] = item.value;
    return map;
};

const buildRequest = (request = {}) => {
    const headers = Array.isArray(request.headers)
        ? request.headers
              .filter((item) => item && item.key && item.enabled !== false)
              .map((item) => ({ key: String(item.key), value: String(item.value ?? '') }))
        : [];
    const next = {
        url: String(request.url || ''),
        method: String(request.method || 'GET').toUpperCase(),
        header: headers
    };
    if (request.body) {
        next.body = { mode: 'raw', raw: String(request.body) };
    }
    return next;
};

const buildResponse = (response = {}) => {
    const headers = response.headers && typeof response.headers === 'object'
        ? Object.entries(response.headers).map(([key, value]) => ({
              key,
              value: Array.isArray(value) ? value.join(', ') : String(value)
          }))
        : [];
    return {
        code: Number(response.statusCode) || 0,
        status: String(response.statusText || ''),
        header: headers,
        body: String(response.response ?? '')
    };
};

const requestToModel = (request = {}) => {
    const headers = Array.isArray(request.header)
        ? request.header.map((item) => ({
              id: item.id || undefined,
              key: String(item.key ?? ''),
              value: String(item.value ?? ''),
              enabled: true
          }))
        : [];
    const rawUrl = request.url;
    const url =
        typeof rawUrl === 'string'
            ? rawUrl
            : rawUrl && typeof rawUrl === 'object'
              ? rawUrl.toString()
              : '';
    const body = request.body
        ? typeof request.body === 'string'
            ? request.body
            : String(request.body.raw ?? request.body.toString?.() ?? '')
        : '';
    return {
        url,
        method: String(request.method || 'GET').toUpperCase(),
        headers,
        body
    };
};

/**
 * 运行 Postman 风格脚本。返回修改后的变量作用域与请求/响应快照。
 *
 * @param {Object} options
 * @param {String} options.script - 待执行的脚本代码
 * @param {String} [options.phase] - 'prerequest' | 'test'
 * @param {Object} [options.environment] - 环境变量（key -> value 或 { values: [] }）
 * @param {Object} [options.collectionVariables] - 集合变量
 * @param {Object} [options.globals] - 全局变量
 * @param {Object} [options.request] - 请求快照
 * @param {Object} [options.response] - 响应快照（仅 test 阶段）
 * @param {Number} [options.timeout]
 */
export async function runSandbox(options = {}) {
    const script = typeof options.script === 'string' ? options.script.trim() : '';
    const emptyResult = {
        ok: true,
        skipped: false,
        error: null,
        tests: [],
        console: [],
        environment: options.environment || {},
        collectionVariables: options.collectionVariables || {},
        globals: options.globals || {},
        request: options.request || null,
        response: options.response || null
    };
    if (!script) return emptyResult;

    let ctx;
    try {
        ctx = await getSandboxContext();
    } catch (error) {
        return { ...emptyResult, ok: false, error: error.message || String(error) };
    }

    const id = `exec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const timeout = Number(options.timeout) > 0 ? Number(options.timeout) : DEFAULT_TIMEOUT;
    const phase = options.phase === 'test' ? 'test' : 'prerequest';

    const consoleEntries = [];
    const tests = [];
    const onConsole = (cursor, level, ...args) => {
        if (cursor?.execution && cursor.execution !== id) return;
        consoleEntries.push({ level: String(level || 'log'), args });
    };
    const onAssertion = (cursor, assertions) => {
        if (cursor?.execution && cursor.execution !== id) return;
        for (const item of Array.isArray(assertions) ? assertions : [assertions]) {
            if (!item) continue;
            tests.push({
                name: String(item.name || ''),
                passed: item.passed !== false,
                skipped: item.skipped === true,
                async: item.async === true,
                error: item.error ? String(item.error.message || item.error) : null
            });
        }
    };
    // pm.sendRequest 需要额外的网络桥接，这里先拦截并返回明确错误，避免脚本挂起。
    const requestEventName = `execution.request.${id}`;
    const onSendRequest = (cursor, executionId, eventId) => {
        if (executionId !== id) return;
        ctx.dispatch(
            `execution.response.${id}`,
            eventId,
            new Error('pm.sendRequest is not supported yet in PowerHub sandbox.'),
            null
        );
    };

    const context = {
        _variables: { values: toVariableValues(options.variables) },
        environment: { values: toVariableValues(options.environment) },
        collectionVariables: { values: toVariableValues(options.collectionVariables) },
        globals: { values: toVariableValues(options.globals) }
    };
    if (options.request) context.request = buildRequest(options.request);
    if (options.response) context.response = buildResponse(options.response);

    ctx.on('console', onConsole);
    ctx.on('execution.assertion', onAssertion);
    ctx.on(requestEventName, onSendRequest);

    const cleanup = () => {
        ctx.removeListener('console', onConsole);
        ctx.removeListener('execution.assertion', onAssertion);
        ctx.removeListener(requestEventName, onSendRequest);
    };

    return await new Promise((resolve) => {
        let settled = false;
        const finish = (payload) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(payload);
        };
        ctx.execute(
            script,
            {
                id,
                context,
                timeout,
                target: phase,
                cursor: { execution: id }
            },
            (error, result) => {
                if (error) {
                    finish({ ...emptyResult, ok: false, error: error.message || String(error), console: consoleEntries, tests });
                    return;
                }
                finish({
                    ok: true,
                    skipped: result?.return?.skipRequest === true,
                    error: null,
                    tests,
                    console: consoleEntries,
                    environment: scopeToMap(result?.environment),
                    collectionVariables: scopeToMap(result?.collectionVariables),
                    globals: scopeToMap(result?.globals),
                    variables: scopeToMap(result?._variables),
                    request: result?.request ? requestToModel(result.request) : options.request || null,
                    response: result?.response || options.response || null
                });
            }
        );
    });
}

export const sandboxInternals = { scopeToMap, toVariableValues };