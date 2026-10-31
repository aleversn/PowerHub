<template>
    <fv-animated-icon class="time-rounder" :title="fullTime">
        <template #default>
            <i class="time-icon ms-Icon" :class="`ms-Icon--${icon}`"></i>
        </template>
        <template #content>
            <span class="time-content">{{ content }}</span>
        </template>
    </fv-animated-icon>
</template>
<script>
import { mapState } from 'pinia';
import { useAppConfigStore } from '@/stores/appConfig';

export default {
    name: 'TimeRounder',
    props: {
        modelValue: { type: [String, Number, Date], default: null },
        icon: { type: String, default: 'Calendar' }
    },
    data() { return { now: Date.now(), timer: null }; },
    computed: {
        ...mapState(useAppConfigStore, ['appLanguage']),
        locale() { return this.appLanguage === 'cn' ? 'zh-CN' : 'en-US'; },
        target() {
            if (this.modelValue === null || this.modelValue === '') return null;
            const date = new Date(this.modelValue);
            return Number.isNaN(date.getTime()) ? null : date;
        },
        fullTime() {
            if (!this.target) return '-';
            return new Intl.DateTimeFormat(this.locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(this.target);
        },
        content() {
            if (!this.target) return '-';
            const now = new Date(this.now);
            const delta = (this.target.getTime() - this.now) / 1000;
            const distance = Math.abs(delta);
            const relative = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });
            const signed = (unit) => (delta < 0 ? -1 : 1) * Math.floor(distance / unit);
            if (distance < 60) return relative.format(signed(1), 'second');
            if (distance < 3600) return relative.format(signed(60), 'minute');
            if (distance < 10800) return relative.format(signed(3600), 'hour');
            const dayNumber = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
            const dayDiff = dayNumber(this.target) - dayNumber(now);
            const time = new Intl.DateTimeFormat(this.locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(this.target);
            if (Math.abs(dayDiff) <= 1) return `${relative.format(dayDiff, 'day')} ${time}`;
            return new Intl.DateTimeFormat(this.locale, { ...(this.target.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}), month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(this.target);
        }
    },
    mounted() { this.timer = setInterval(() => { this.now = Date.now(); }, 1000); },
    beforeUnmount() { clearInterval(this.timer); }
};
</script>
<style lang="scss" scoped>
.time-rounder { min-width: 0; cursor: default; color: inherit; }
.time-icon { font-size: 12px; }
.time-content { display: inline-block; min-width: 0; margin-left: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
</style>
