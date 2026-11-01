import onecolor from 'onecolor';
import { defineStore } from 'pinia';

import { useAppConfigStore } from './appConfig';

export const useThemeStore = defineStore('theme', {
    state: () => ({
        themeColor: 'rgba(237, 221, 103, 1)',
        subThemeColor: 'rgba(220, 249, 96, 1)'
    }),
    getters: {
        theme() {
            return useAppConfigStore().config.theme;
        },
        color() {
            return this.themeColor;
        },
        color01() {
            let color = onecolor(this.themeColor);
            color = color.alpha(0.1);
            return color.cssa();
        },
        gradient() {
            let color = onecolor(this.themeColor);
            color = color.alpha(1);
            const from = color.cssa();
            const hsl = color.hsl();
            let h = Math.round(hsl.h() * 360);
            let s = hsl.s();
            let l = hsl.l();
            h = h + 25;
            s = (s - 0.1).toFixed(2);
            l = (l - 0.06).toFixed(2);
            const to = `hsla(${h}, ${s * 100}%, ${l * 100}%, 1)`;
            return `linear-gradient(to right, ${from}, ${to})`;
        },
        gradient01() {
            let color = onecolor(this.themeColor);
            color = color.alpha(0.1);
            const from = color.cssa();
            const hsl = color.hsl();
            let h = Math.round(hsl.h() * 360);
            let s = hsl.s();
            let l = hsl.l();
            h = h + 25;
            s = (s - 0.1).toFixed(2);
            l = (l - 0.06).toFixed(2);
            const to = `hsla(${h}, ${s * 100}%, ${l * 100}%, 0.1)`;
            return `linear-gradient(to right, ${from}, ${to})`;
        },
        gray01() {
            let color = onecolor(this.themeColor);
            color = color.alpha(1);
            const hsl = color.hsl();
            const h = hsl.h();
            const s = 0.1;
            const l = hsl.l();
            return `hsla(${h}, ${s * 100}%, ${l * 100}%, 1)`;
        },
        subColor() {
            return this.subThemeColor;
        }
    },
    actions: {
        reviseTheme(themeValue) {
            useAppConfigStore().setTheme(themeValue);
        },
        toggleTheme() {
            useAppConfigStore().toggleTheme();
        }
    }
});

export const useTheme = useThemeStore;
