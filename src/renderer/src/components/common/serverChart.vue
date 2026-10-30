<template>
    <div class="server-chart" :class="`is-${type}`">
        <div ref="chartElement" class="chart-canvas"></div>
        <div class="chart-caption">
            <span>{{ label }}</span>
            <strong>{{ displayValue }}</strong>
        </div>
    </div>
</template>

<script>
import * as echarts from 'echarts';

export default {
    name: 'ServerChart',
    props: {
        type: {
            type: String,
            default: 'gauge'
        },
        value: {
            type: Number,
            default: 0
        },
        series: {
            type: Array,
            default: () => []
        },
        values: {
            type: Array,
            default: () => []
        },
        label: {
            type: String,
            default: ''
        },
        unit: {
            type: String,
            default: '%'
        },
        color: {
            type: String,
            default: '#0078d4'
        },
        theme: {
            type: String,
            default: 'light'
        }
    },
    data() {
        return {
            chart: null,
            resizeObserver: null
        };
    },
    computed: {
        displayValue() {
            const value = Number(this.value);
            if (!Number.isFinite(value)) return `0${this.unit}`;
            const rounded = Math.round(value * 10) / 10;
            return `${rounded}${this.unit}`;
        },
        chartColors() {
            const dark = this.theme === 'dark';
            return {
                text: dark ? '#c2c8d2' : '#505867',
                grid: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                track: dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)',
                border: dark ? '#1f2227' : '#ffffff'
            };
        }
    },
    watch: {
        type() {
            this.renderChart();
        },
        value() {
            this.renderChart();
        },
        series() {
            this.renderChart();
        },
        values() {
            this.renderChart();
        },
        theme() {
            this.renderChart();
        }
    },
    mounted() {
        this.ensureChart();
        this.renderChart();
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.resizeChart());
            this.resizeObserver.observe(this.$refs.chartElement);
        } else {
            window.addEventListener('resize', this.resizeChart);
        }
    },
    beforeUnmount() {
        this.resizeObserver?.disconnect();
        window.removeEventListener('resize', this.resizeChart);
        this.chart?.dispose();
        this.chart = null;
    },
    methods: {
        ensureChart() {
            if (!this.chart && this.$refs.chartElement) {
                this.chart = echarts.init(this.$refs.chartElement, null, {
                    renderer: 'canvas'
                });
            }
        },
        resizeChart() {
            this.chart?.resize();
        },
        renderChart() {
            this.ensureChart();
            if (!this.chart) return;
            let option = this.gaugeOption();
            if (this.type === 'line') option = this.lineOption();
            else if (this.type === 'load') option = this.loadOption();
            this.chart.setOption(option, true);
        },
        gaugeOption() {
            const value = Math.min(Math.max(Number(this.value) || 0, 0), 100);
            return {
                animationDuration: 420,
                series: [
                    {
                        type: 'pie',
                        radius: ['72%', '90%'],
                        center: ['50%', '50%'],
                        startAngle: 90,
                        clockwise: true,
                        silent: true,
                        label: { show: false },
                        emphasis: { scale: false },
                        itemStyle: {
                            borderColor: this.chartColors.border,
                            borderWidth: 2,
                            borderRadius: 8
                        },
                        data: [
                            {
                                value,
                                itemStyle: { color: this.color }
                            },
                            {
                                value: Math.max(0, 100 - value),
                                itemStyle: { color: this.chartColors.track }
                            }
                        ]
                    }
                ]
            };
        },
        loadOption() {
            const rings = (this.values.length ? this.values : [0, 0, 0])
                .slice(0, 3)
                .map((item) => Math.min(Math.max(Number(item) || 0, 0), 100));
            const palette = ['#10b981', '#0ea5e9', '#8b5cf6'];
            const radii = [
                ['76%', '96%'],
                ['52%', '72%'],
                ['28%', '48%']
            ];
            return {
                animationDuration: 420,
                series: rings.map((value, index) => ({
                    type: 'pie',
                    radius: radii[index],
                    center: ['50%', '50%'],
                    startAngle: 90,
                    clockwise: true,
                    silent: true,
                    label: { show: false },
                    emphasis: { scale: false },
                    itemStyle: {
                        borderColor: this.chartColors.border,
                        borderWidth: 1
                    },
                    data: [
                        { value, itemStyle: { color: this.loadColor(value, palette[index]) } },
                        {
                            value: Math.max(0, 100 - value),
                            itemStyle: { color: this.chartColors.track }
                        }
                    ]
                }))
            };
        },
        loadColor(value, fallback) {
            if (value >= 85) return '#ef4444';
            if (value >= 65) return '#f59e0b';
            return fallback;
        },
        lineOption() {
            const values = this.series.map((item) => Number(item) || 0);
            return {
                animationDuration: 420,
                grid: {
                    left: 4,
                    right: 4,
                    top: 10,
                    bottom: 6
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    show: false,
                    data: values.map((_, index) => index)
                },
                yAxis: {
                    type: 'value',
                    show: false,
                    min: (value) => Math.max(0, Math.floor(value.min - 1)),
                    max: (value) => Math.ceil(value.max + 1)
                },
                series: [
                    {
                        type: 'line',
                        data: values,
                        smooth: true,
                        showSymbol: false,
                        lineStyle: {
                            width: 2,
                            color: this.color
                        },
                        areaStyle: {
                            color: this.withAlpha(this.color, 0.18)
                        }
                    }
                ]
            };
        },
        withAlpha(color, alpha) {
            if (!color?.startsWith('#')) return color;
            const value = color.slice(1);
            const normalized =
                value.length === 3
                    ? value
                          .split('')
                          .map((item) => item + item)
                          .join('')
                    : value;
            const numeric = Number.parseInt(normalized, 16);
            const red = (numeric >> 16) & 255;
            const green = (numeric >> 8) & 255;
            const blue = numeric & 255;
            return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        }
    }
};
</script>

<style lang="scss" scoped>
.server-chart {
    position: relative;
    width: 72px;
    height: 72px;
    margin: 0 auto;

    .chart-canvas {
        width: 100%;
        height: 100%;
    }

    .chart-caption {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        pointer-events: none;

        span {
            color: var(--ph-text-muted);
            font-size: 9px;
            line-height: 1;
        }

        strong {
            margin-top: 3px;
            color: var(--ph-text);
            font-size: 13px;
            font-variant-numeric: tabular-nums;
            line-height: 1;
        }
    }

    &.is-line {
        width: 100%;
        height: 52px;
        margin: 0;

        .chart-canvas {
            width: 100%;
            height: 52px;
        }

        .chart-caption {
            display: none;
        }
    }

    &.is-load {
        .chart-caption {
            span {
                display: none;
            }

            strong {
                margin-top: 0;
                font-size: 12px;
            }
        }
    }
}
</style>