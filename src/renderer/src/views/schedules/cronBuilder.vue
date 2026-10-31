<template>
    <floatWindowBase :model-value="modelValue" :title="local('Adjust schedule')" :theme="resolvedTheme" width="560px" height="min(720px, 90%)" :teleport="true" @update:model-value="$emit('update:modelValue', $event)">
        <template #content>
            <div class="cron-builder">
                <p class="intro">{{ local('Choose when this task should run.') }}</p>
                <div v-if="unsupported" class="warning" role="alert">
                    <span>{{ local('This expression cannot be represented by the visual editor. The original expression will be preserved.') }}</span>
                    <fv-button :theme="resolvedTheme" @click="resetFields">{{ local('Start with a daily schedule') }}</fv-button>
                </div>
                <template v-else>
                    <div class="field">
                        <span>{{ local('Minute interval') }}</span>
                        <fv-drop-down max-height="220px" :theme="resolvedTheme" :options="intervalOptions" :model-value="intervalOptions.filter(option => option.key === (interval || 'none'))" @update:model-value="interval = $event?.[0]?.key === 'none' ? '' : ($event?.[0]?.key || '')" />
                    </div>
                    <div class="field">
                        <span>{{ local('Time') }}</span>
                        <fv-time-picker v-model="time" :time-type="24" :theme="resolvedTheme" :disabled="Boolean(interval)" />
                        <small v-if="interval">{{ local('The interval runs throughout each selected day and restarts at the beginning of each hour.') }}</small>
                    </div>
                    <div class="field">
                        <span>{{ local('Day of month') }}</span>
                        <fv-drop-down max-height="220px" :theme="resolvedTheme" :multiple="true" :options="dayOptions" :model-value="dayOptions.filter(option => days.includes(option.key))" :placeholder="local('Every day')" @change="changeValues('days', $event)" />
                    </div>
                    <div class="field">
                        <span>{{ local('Month') }}</span>
                        <fv-drop-down max-height="220px" :theme="resolvedTheme" :multiple="true" :options="monthOptions" :model-value="monthOptions.filter(option => months.includes(option.key))" :placeholder="local('Every month')" @change="changeValues('months', $event)" />
                    </div>
                    <div class="field">
                        <span>{{ local('Day of week') }}</span>
                        <fv-drop-down max-height="220px" :theme="resolvedTheme" :multiple="true" :options="weekdayOptions" :model-value="weekdayOptions.filter(option => weekdays.includes(option.key))" :placeholder="local('Every day of week')" @change="changeValues('weekdays', $event)" />
                    </div>
                    <small>{{ local('Leave a selection empty to include all values.') }}</small>
                    <small v-if="days.length && weekdays.length">{{ local('When both day fields are selected, either one may match.') }}</small>
                    <div class="preview"><span>{{ local('Cron expression') }}</span><code>{{ expression }}</code></div>
                </template>
            </div>
        </template>
        <template #control>
            <div class="actions">
                <fv-button :theme="resolvedTheme" @click="$emit('update:modelValue', false)">{{ local('Cancel') }}</fv-button>
                <fv-button :theme="resolvedTheme" background="#0078d4" foreground="#fff" :disabled="unsupported" @click="apply">{{ local('Apply') }}</fv-button>
            </div>
        </template>
    </floatWindowBase>
</template>
<script>
import { mapState } from 'pinia';
import floatWindowBase from '@/components/window/floatWindowBase.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { parseCronFields, buildCronFields } from './cronFields.js';

const MONTH_KEYS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export default {
    name: 'CronBuilder',
    components: { floatWindowBase },
    props: { modelValue: { type: Boolean, default: false }, cron: { type: String, default: '' } },
    emits: ['update:modelValue', 'apply'],
    data() { return { unsupported: false, interval: '', time: new Date(2000, 0, 1, 0, 0), days: [], months: [], weekdays: [] }; },
    computed: {
        ...mapState(useAppConfigStore, ['local', 'resolvedTheme']),
        intervalOptions() {
            return [{ key: 'none', text: this.local('No minute interval') }, ...Array.from({ length: 59 }, (_, i) => ({ key: String(i + 1), text: this.local('Every {count} minutes').replace('{count}', i + 1) }))];
        },
        dayOptions() { return Array.from({ length: 31 }, (_, i) => ({ key: String(i + 1), text: String(i + 1), choosen: this.days.includes(String(i + 1)) })); },
        monthOptions() { return MONTH_KEYS.map((key, i) => ({ key: String(i + 1), text: this.local(key), choosen: this.months.includes(String(i + 1)) })); },
        weekdayOptions() { return WEEKDAY_KEYS.map((key, i) => ({ key: String(i), text: this.local(key), choosen: this.weekdays.includes(String(i)) })); },
        expression() { return buildCronFields({ interval: this.interval, hour: this.time.getHours(), minute: this.time.getMinutes(), days: this.days, months: this.months, weekdays: this.weekdays }); }
    },
    watch: { modelValue: { immediate: true, handler(value) { if (value) this.loadExpression(); } } },
    methods: {
        loadExpression() {
            const parsed = parseCronFields(this.cron);
            this.unsupported = !parsed;
            if (!parsed) return;
            this.interval = parsed.interval;
            this.time = new Date(2000, 0, 1, parsed.hour, parsed.minute);
            this.days = parsed.days; this.months = parsed.months; this.weekdays = parsed.weekdays;
        },
        resetFields() { this.interval = ''; this.time = new Date(2000, 0, 1, 0, 0); this.days = []; this.months = []; this.weekdays = []; this.unsupported = false; },
        changeValues(field, event) {
            const option = event?.option;
            if (!option) return;
            const key = String(option.key);
            const values = new Set(this[field]);
            if (option.choosen) values.add(key);
            else values.delete(key);
            this[field] = [...values];
        },
        apply() { if (!this.unsupported) { this.$emit('apply', this.expression); this.$emit('update:modelValue', false); } }
    }
};
</script>
<style lang="scss" scoped>
.cron-builder {
    display: flex; flex-direction: column; gap: 14px; min-width: 0;
    .intro { margin: 0; color: var(--ph-text-secondary); }
    .field { display: flex; flex-direction: column; gap: 6px; color: var(--ph-text-secondary); font-size: 12px; }
    small { color: var(--ph-text-muted); line-height: 1.5; }
    .warning { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; color: var(--ph-warning); line-height: 1.5; }
    .preview { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; background: var(--ph-surface-soft); color: var(--ph-text-secondary); }
    code { min-width: 0; overflow-wrap: anywhere; color: var(--ph-text); }
}
.actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
