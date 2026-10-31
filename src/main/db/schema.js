import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// 接口集合。endpoint.collection 存集合名称，空值统一归入默认集合。
export const collections = sqliteTable(
    'collections',
    {
        id: text('id').primaryKey(),
        name: text('name').notNull(),
        emoji: text('emoji').notNull().default(''),
        sortOrder: integer('sort_order').notNull().default(0),
        createdAt: text('created_at').notNull(),
        updatedAt: text('updated_at').notNull()
    },
    (table) => [index('collections_sort_idx').on(table.sortOrder)]
);

// 接口请求配置。
export const endpoints = sqliteTable(
    'endpoints',
    {
        id: text('id').primaryKey(),
        name: text('name').notNull(),
        method: text('method').notNull().default('GET'),
        url: text('url').notNull(),
        collection: text('collection').notNull().default('Default collection'),
        description: text('description').notNull().default(''),
        params: text('params').notNull().default('[]'),
        headersData: text('headers_data').notNull().default('[]'),
        authType: text('auth_type').notNull().default('none'),
        authData: text('auth_data').notNull().default('{}'),
        bodyType: text('body_type').notNull().default('none'),
        body: text('body').notNull().default(''),
        preRequestScript: text('pre_request_script').notNull().default(''),
        postResponseScript: text('post_response_script').notNull().default(''),
        headers: integer('headers').notNull().default(0),
        sortOrder: integer('sort_order').notNull().default(0),
        enabled: integer('enabled', { mode: 'boolean' })
            .notNull()
            .default(true),
        health: text('health').notNull().default('healthy'),
        latency: integer('latency'),
        createdAt: text('created_at').notNull(),
        updatedAt: text('updated_at').notNull()
    },
    (table) => [
        index('endpoints_collection_idx').on(table.collection),
        index('endpoints_sort_idx').on(table.sortOrder),
        index('endpoints_enabled_idx').on(table.enabled)
    ]
);

// 定时任务，绑定到某个 endpoint。
export const schedules = sqliteTable(
    'schedules',
    {
        id: text('id').primaryKey(),
        name: text('name').notNull(),
        endpointId: text('endpoint_id').references(() => endpoints.id, {
            onDelete: 'cascade'
        }),
        taskType: text('task_type').notNull().default('legacy'),
        collection: text('collection').notNull().default(''),
        flow: text('flow').notNull().default('{}'),
        cron: text('cron').notNull(),
        enabled: integer('enabled', { mode: 'boolean' })
            .notNull()
            .default(true),
        nextRun: text('next_run'),
        lastRun: text('last_run'),
        lastStatus: text('last_status').notNull().default('idle'),
        createdAt: text('created_at').notNull(),
        updatedAt: text('updated_at').notNull()
    },
    (table) => [
        index('schedules_endpoint_idx').on(table.endpointId),
        index('schedules_enabled_idx').on(table.enabled)
    ]
);

// 运行记录，只增不删，按 endpoint / 时间建索引便于分页与清理。
export const runs = sqliteTable(
    'runs',
    {
        id: text('id').primaryKey(),
        endpointId: text('endpoint_id').references(() => endpoints.id, {
            onDelete: 'set null'
        }),
        scheduleId: text('schedule_id').references(() => schedules.id, {
            onDelete: 'set null'
        }),
        status: text('status').notNull(),
        statusCode: integer('status_code'),
        duration: integer('duration'),
        startedAt: text('started_at').notNull(),
        triggeredBy: text('triggered_by').notNull().default('manual'),
        mode: text('mode').notNull().default('live'),
        requestUrl: text('request_url'),
        response: text('response'),
        responseHeaders: text('response_headers').notNull().default('{}'),
        error: text('error'),
        nodeResults: text('node_results').notNull().default('[]'),
        flowSnapshot: text('flow_snapshot').notNull().default('{}')
    },
    (table) => [
        index('runs_endpoint_idx').on(table.endpointId),
        index('runs_schedule_idx').on(table.scheduleId),
        index('runs_started_idx').on(table.startedAt)
    ]
);

// 集合级变量（environment）。type 支持 text / blob；value 为字符串，blob 以 data URL 或文本形式存储。
export const collectionVariables = sqliteTable(
    'collection_variables',
    {
        id: text('id').primaryKey(),
        collection: text('collection').notNull().default('Default collection'),
        key: text('key').notNull(),
        value: text('value').notNull().default(''),
        type: text('type').notNull().default('text'),
        hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
        enabled: integer('enabled', { mode: 'boolean' })
            .notNull()
            .default(true),
        description: text('description').notNull().default(''),
        sortOrder: integer('sort_order').notNull().default(0),
        createdAt: text('created_at').notNull(),
        updatedAt: text('updated_at').notNull()
    },
    (table) => [
        index('collection_variables_collection_idx').on(table.collection),
        index('collection_variables_sort_idx').on(table.sortOrder)
    ]
);

// 键值型应用配置（theme / language / 请求默认值等），替代 localStorage。
export const settings = sqliteTable('settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: text('updated_at').notNull()
});

export const schema = {
    collections,
    endpoints,
    schedules,
    runs,
    settings,
    collectionVariables
};