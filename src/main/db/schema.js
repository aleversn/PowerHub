import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// 接口请求集合。
export const endpoints = sqliteTable(
    'endpoints',
    {
        id: text('id').primaryKey(),
        name: text('name').notNull(),
        method: text('method').notNull().default('GET'),
        url: text('url').notNull(),
        collection: text('collection').notNull().default('Personal'),
        headers: integer('headers').notNull().default(0),
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
        mode: text('mode').notNull().default('mock')
    },
    (table) => [
        index('runs_endpoint_idx').on(table.endpointId),
        index('runs_schedule_idx').on(table.scheduleId),
        index('runs_started_idx').on(table.startedAt)
    ]
);

// 键值型应用配置（theme / language / 请求默认值等），替代 localStorage。
export const settings = sqliteTable('settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: text('updated_at').notNull()
});

export const schema = {
    endpoints,
    schedules,
    runs,
    settings
};