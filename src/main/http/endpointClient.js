import http from 'http';
import https from 'https';
import { URL } from 'url';

import {
    listCollectionVariables,
    replaceCollectionVariables
} from '../repositories/workspace.js';
import { runSandbox } from '../scripts/sandboxRunner.js';

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_COLLECTION = 'Default collection';

const safeJsonParse = (value, fallback) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const normalizeKeyValueList = (list, { keepDisabled = false } = {}) =>
    Array.isArray(list)
        ? list
              .map((item) => ({
                  key: String(item?.key ?? '').trim(),
                  value: String(item?.value ?? ''),
                  enabled: item?.enabled !== false
              }))
              .filter((item) => item.key && (keepDisabled || item.enabled))
        : [];

const resolveHeaderKey = (headers, name) => {
    const target = String(name).toLowerCase();
    return Object.keys(headers).find((key) => key.toLowerCase() === target);
};

const headerListToObject = (headers = []) => {
    const result = {};
    for (const item of Array.isArray(headers) ? headers : []) {
        if (!item || !item.key) continue;
        if (item.enabled === false) continue;
        result[String(item.key)] = String(item.value ?? '');
    }
    return result;
};

const normalizeAuth = (authType, authData = {}) => {
    const type = String(authType || 'none').toLowerCase();
    const data = authData && typeof authData === 'object' ? authData : {};
    if (type === 'bearer') {
        const token = String(data.token ?? '').trim();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
    if (type === 'basic') {
        const username = String(data.username ?? '');
        const password = String(data.password ?? '');
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        return { Authorization: `Basic ${token}` };
    }
    if (type === 'api-key') {
        const key = String(data.key ?? '').trim();
        const value = String(data.value ?? '');
        if (!key) return {};
        return data.in === 'query'
            ? { __query: { [key]: value } }
            : { [key]: value };
    }
    return {};
};

const buildRequestBody = (payload = {}) => {
    const formData = Array.isArray(payload.formData)
        ? payload.formData
        : safeJsonParse(payload.body, []);
    const bodyType = String(payload.bodyType || 'none').toLowerCase();
    const body = typeof payload.body === 'string' ? payload.body : '';
    if (bodyType === 'none' || !body) return null;
    if (bodyType === 'json') return { data: body, contentType: 'application/json' };
    if (bodyType === 'form') {
        const params = new URLSearchParams();
        for (const item of normalizeKeyValueList(formData)) {
            params.append(item.key, item.value);
        }
        return {
            data: params.toString(),
            contentType: 'application/x-www-form-urlencoded'
        };
    }
    return { data: body, contentType: '' };
};

const collectResponse = (response) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        response.on('data', (chunk) => {
            total += chunk.length;
            if (total > MAX_RESPONSE_BYTES) {
                response.destroy(new Error('Response body exceeds 2 MB.'));
                return;
            }
            chunks.push(chunk);
        });
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
    });

const loadCollectionVariableMap = (collection) => {
    try {
        const rows = listCollectionVariables(collection || DEFAULT_COLLECTION);
        const map = {};
        for (const item of rows) {
            if (item.enabled === false || !item.key) continue;
            map[item.key] = item.value;
        }
        return map;
    } catch {
        return {};
    }
};

// 合并脚本执行前后的变量作用域，environment / collectionVariables / globals 的写入都会回写。
const mergeVariableResult = (base, runResult) => {
    const merged = { ...base };
    for (const scope of ['collectionVariables', 'globals', 'environment']) {
        const values = runResult?.[scope];
        if (!values || typeof values !== 'object') continue;
        for (const [key, value] of Object.entries(values)) {
            if (!key) continue;
            if (!Object.hasOwn(base, key) || value !== base[key]) merged[key] = value;
        }
    }
    return merged;
};

const substituteVariables = (text, variables) => {
    if (typeof text !== 'string' || !text) return text;
    return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, rawKey) => {
        const key = String(rawKey).trim();
        if (!key) return match;
        if (!Object.hasOwn(variables, key)) return match;
        const value = variables[key];
        return value === null || value === undefined ? '' : String(value);
    });
};

const pickScriptResult = (runResult) =>
    runResult
        ? {
              ok: runResult.ok !== false,
              error: runResult.error || null,
              tests: runResult.tests || [],
              console: runResult.console || []
          }
        : null;

export async function sendEndpointRequest(payload = {}) {
    const startedAt = Date.now();
    const method = String(payload.method || 'GET').toUpperCase();
    const timeout = Math.min(Math.max(Number(payload.timeout) || 30000, 1000), 300000);
    const collection = payload.collection || DEFAULT_COLLECTION;

    let initialVariables = loadCollectionVariableMap(collection);

    let target;
    try {
        target = new URL(String(payload.url || '').trim());
        if (!['http:', 'https:'].includes(target.protocol)) {
            throw new Error('Only HTTP and HTTPS URLs are supported.');
        }
    } catch (error) {
        return {
            ok: false,
            status: 'failed',
            statusCode: null,
            duration: Date.now() - startedAt,
            url: payload.url || '',
            error: error.message || 'Invalid request URL.'
        };
    }

    for (const item of normalizeKeyValueList(payload.params)) {
        target.searchParams.append(item.key, item.value);
    }

    const baseHeaders = headerListToObject(
        normalizeKeyValueList(payload.headersData || payload.headers || [], {
            keepDisabled: true
        })
    );
    const auth = normalizeAuth(payload.authType, payload.authData);
    const authQuery = auth.__query;
    delete auth.__query;
    for (const [key, value] of Object.entries(auth)) baseHeaders[key] = value;
    if (authQuery) {
        for (const [key, value] of Object.entries(authQuery)) {
            target.searchParams.set(key, value);
        }
    }

    const requestBody = buildRequestBody(payload);

    // 请求快照交给 pre-request 脚本，脚本可通过 pm.request 修改 URL / 请求头 / 请求体。
    let currentRequest = {
        url: target.toString(),
        method,
        headers: Object.entries(baseHeaders).map(([key, value]) => ({
            key,
            value: String(value),
            enabled: true
        })),
        body: requestBody?.data ?? '',
        contentType: requestBody?.contentType || ''
    };

    let variables = { ...initialVariables };
    let preRequestScript = null;
    if (payload.preRequestScript) {
        const runResult = await runSandbox({
            script: payload.preRequestScript,
            phase: 'prerequest',
            environment: variables,
            collectionVariables: variables,
            globals: {},
            request: currentRequest
        });
        preRequestScript = pickScriptResult(runResult);
        variables = mergeVariableResult(variables, runResult);
        if (runResult?.request) {
            currentRequest = {
                url: runResult.request.url || currentRequest.url,
                method: runResult.request.method || currentRequest.method,
                headers: Array.isArray(runResult.request.headers)
                    ? runResult.request.headers
                    : currentRequest.headers,
                body:
                    runResult.request.body !== undefined
                        ? runResult.request.body
                        : currentRequest.body,
                contentType: currentRequest.contentType
            };
        }
    }

    // 变量替换发生在脚本之后、真正发送之前，符合 Postman 的解析时机。
    const resolvedUrl = substituteVariables(currentRequest.url, variables);
    let finalTarget;
    try {
        finalTarget = new URL(resolvedUrl);
        if (!['http:', 'https:'].includes(finalTarget.protocol)) {
            throw new Error('Only HTTP and HTTPS URLs are supported.');
        }
        const query = [...finalTarget.searchParams.entries()];
        finalTarget.search = '';
        for (const [key, value] of query) {
            finalTarget.searchParams.append(key, substituteVariables(value, variables));
        }
    } catch (error) {
        return {
            ok: false,
            status: 'failed',
            statusCode: null,
            duration: Date.now() - startedAt,
            url: resolvedUrl,
            error: error.message || 'Invalid request URL.',
            script: { preRequest: preRequestScript, postResponse: null }
        };
    }

    const headers = {};
    for (const item of currentRequest.headers) {
        if (!item?.key || item.enabled === false) continue;
        headers[String(item.key)] = substituteVariables(String(item.value ?? ''), variables);
    }

    // Basic credentials must be resolved before base64 encoding.
    if (String(payload.authType || '').toLowerCase() === 'basic') {
        const headerKey = resolveHeaderKey(headers, 'authorization');
        const original = normalizeAuth(payload.authType, payload.authData).Authorization;
        if (headerKey && headers[headerKey] === original) {
            const data = payload.authData || {};
            headers[headerKey] = normalizeAuth('basic', {
                username: substituteVariables(String(data.username ?? ''), variables),
                password: substituteVariables(String(data.password ?? ''), variables)
            }).Authorization;
        }
    }
    const resolvedMethod = String(currentRequest.method || method).toUpperCase();
    let resolvedBody = substituteVariables(currentRequest.body ?? '', variables);
    if (currentRequest.contentType === 'application/x-www-form-urlencoded') {
        const fields = new URLSearchParams(resolvedBody);
        const resolvedFields = new URLSearchParams();
        for (const [key, value] of fields) resolvedFields.append(key, substituteVariables(value, variables));
        resolvedBody = resolvedFields.toString();
    }
    const hasBody = Boolean(resolvedBody) && !['GET', 'HEAD'].includes(resolvedMethod);
    if (hasBody) {
        headers['Content-Length'] = Buffer.byteLength(resolvedBody);
        if (
            currentRequest.contentType &&
            !resolveHeaderKey(headers, 'content-type')
        ) {
            headers['Content-Type'] = currentRequest.contentType;
        }
    }

    const transport = finalTarget.protocol === 'https:' ? https : http;
    const requestOptions = {
        method: resolvedMethod,
        headers,
        timeout,
        rejectUnauthorized: payload.verifySSL !== false
    };

    const responsePayload = await new Promise((resolve) => {
        const request = transport.request(finalTarget, requestOptions, async (response) => {
            try {
                const buffer = await collectResponse(response);
                const duration = Date.now() - startedAt;
                const contentType = String(response.headers['content-type'] || '');
                const responseText = buffer.toString('utf8');
                const statusCode = Number(response.statusCode) || 0;
                resolve({
                    ok: statusCode >= 200 && statusCode < 400,
                    status:
                        statusCode >= 200 && statusCode < 400
                            ? statusCode < 300
                                ? 'success'
                                : 'warning'
                            : 'failed',
                    statusCode,
                    statusText: response.statusMessage || '',
                    duration,
                    url: finalTarget.toString(),
                    headers: response.headers,
                    contentType,
                    response: responseText.slice(0, MAX_RESPONSE_BYTES),
                    size: buffer.length
                });
            } catch (error) {
                resolve({
                    ok: false,
                    status: 'failed',
                    statusCode: response.statusCode || null,
                    duration: Date.now() - startedAt,
                    url: finalTarget.toString(),
                    error: error.message || 'Failed to read response.'
                });
            }
        });

        request.on('timeout', () => {
            request.destroy(new Error(`Request timed out after ${timeout} ms.`));
        });
        request.on('error', (error) => {
            resolve({
                ok: false,
                status: 'failed',
                statusCode: null,
                duration: Date.now() - startedAt,
                url: finalTarget.toString(),
                error: error.message || 'Request failed.'
            });
        });

        if (hasBody) request.write(resolvedBody);
        request.end();
    });

    let postResponseScript = null;
    if (payload.postResponseScript) {
        const runResult = await runSandbox({
            script: payload.postResponseScript,
            phase: 'test',
            environment: variables,
            collectionVariables: variables,
            globals: {},
            request: {
                url: finalTarget.toString(),
                method: resolvedMethod,
                headers: currentRequest.headers,
                body: resolvedBody
            },
            response: {
                statusCode: responsePayload.statusCode,
                statusText: responsePayload.statusText,
                headers: responsePayload.headers,
                response: responsePayload.response
            }
        });
        postResponseScript = pickScriptResult(runResult);
        variables = mergeVariableResult(variables, runResult);
    }

    // 任一阶段脚本若修改变量，都写回当前集合的变量表，供后续请求复用。
    persistVariables(collection, initialVariables, variables);

    return {
        ...responsePayload,
        script: {
            preRequest: preRequestScript,
            postResponse: postResponseScript
        }
    };
}

const persistVariables = (collection, before, after) => {
    try {
        const changed = Object.keys(after).some((key) => before[key] !== after[key]) ||
            Object.keys(before).some((key) => !Object.hasOwn(after, key));
        if (!changed) return;
        const existing = listCollectionVariables(collection);
        const modified = (key) => Object.hasOwn(after, key) && (!Object.hasOwn(before, key) || before[key] !== after[key]);
        const existingKeys = new Set(existing.map((item) => item.key));
        const variables = [];
        for (const item of existing) {
            variables.push({
                ...item,
                value: modified(item.key) ? String(after[item.key] ?? '') : item.value
            });
        }
        for (const [key, value] of Object.entries(after)) {
            if (!key || existingKeys.has(key) || !modified(key)) continue;
            variables.push({
                collection,
                key,
                value: String(value ?? ''),
                type: 'text',
                enabled: true,
                hidden: false
            });
        }
        replaceCollectionVariables(collection, variables);
    } catch {
        // 变量写回失败不影响请求结果本身，静默忽略。
    }
};
