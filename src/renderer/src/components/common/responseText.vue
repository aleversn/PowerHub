<template>
    <pre class="response-text"><code v-if="language" class="hljs" v-html="highlighted"></code><code v-else>{{ text }}</code></pre>
</template>
<script>
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import javascript from 'highlight.js/lib/languages/javascript';
import css from 'highlight.js/lib/languages/css';

hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('css', css);

export default {
    name: 'ResponseText',
    props: { text: { type: String, default: '' }, headers: { type: Object, default: () => ({}) } },
    computed: {
        language() {
            const contentType = String(Object.entries(this.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '').toLowerCase();
            if (contentType.includes('json')) return 'json';
            if (contentType.includes('xml') || contentType.includes('html') || contentType.includes('svg')) return 'xml';
            if (contentType.includes('javascript')) return 'javascript';
            if (contentType.includes('css')) return 'css';
            if (!contentType && ['[', '{'].includes(this.text.trimStart()[0])) {
                try { JSON.parse(this.text); return 'json'; } catch { return ''; }
            }
            return '';
        },
        highlighted() { return this.language ? hljs.highlight(this.text, { language: this.language, ignoreIllegals: true }).value : ''; }
    }
};
</script>
<style lang="scss" scoped>
.response-text { max-width: 100%; max-height: 260px; overflow: auto; margin: 0; padding: 12px; border-radius: 10px; background: var(--ph-surface-soft); color: var(--ph-text); font-family: var(--ph-code-font); font-size: 12px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.response-text :deep(.hljs-attr), .response-text :deep(.hljs-attribute), .response-text :deep(.hljs-tag) { color: var(--ph-code-key); }
.response-text :deep(.hljs-string), .response-text :deep(.hljs-addition) { color: var(--ph-code-string); }
.response-text :deep(.hljs-number), .response-text :deep(.hljs-literal), .response-text :deep(.hljs-keyword) { color: var(--ph-code-value); }
.response-text :deep(.hljs-comment) { color: var(--ph-text-muted); }
</style>
