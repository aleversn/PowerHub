<template>
    <div class="variable-input">
        <input v-if="secret && !revealed" :value="modelValue" type="password" :placeholder="placeholder" @input="$emit('update:modelValue', $event.target.value)" />
        <div v-else ref="editorEl" class="variable-editor"></div>
        <button v-if="secret" type="button" class="reveal-button" :title="local(revealed ? 'Hide' : 'Show')" @click="revealed = !revealed">
            <i :class="`ms-Icon ms-Icon--${revealed ? 'Hide' : 'View'}`"></i>
        </button>
    </div>
</template>

<script>
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, Decoration, ViewPlugin, MatchDecorator, hoverTooltip, placeholder as editorPlaceholder } from '@codemirror/view';
import { minimalSetup } from 'codemirror';
import { autocompletion, startCompletion } from '@codemirror/autocomplete';
import { mapState } from 'pinia';
import { useAppConfigStore } from '@/stores/appConfig';

export default {
    name: 'VariableInput',
    props: {
        modelValue: { type: String, default: '' },
        placeholder: { type: String, default: '' },
        variables: { type: Array, default: () => [] },
        secret: { type: Boolean, default: false },
        initiallyHidden: { type: Boolean, default: true }
    },
    emits: ['update:modelValue'],
    data() { return { revealed: !this.secret || !this.initiallyHidden }; },
    computed: { ...mapState(useAppConfigStore, ['local']) },
    watch: {
        modelValue(value) {
            if (this.editor && value !== this.editor.state.doc.toString()) {
                this.editor.dispatch({ changes: { from: 0, to: this.editor.state.doc.length, insert: value || '' } });
            }
        },
        variables: { deep: true, handler() { this.updateVariables(); } },
        revealed() { this.$nextTick(() => this.createEditor()); }
    },
    mounted() { this.createEditor(); },
    beforeUnmount() { this.editor?.destroy(); },
    methods: {
        createEditor() {
            this.editor?.destroy();
            this.editor = null;
            if (!this.$refs.editorEl) return;
            this.variableCompartment = new Compartment();
            this.editor = new EditorView({
                state: EditorState.create({
                    doc: this.modelValue || '',
                    extensions: [
                        minimalSetup,
                        EditorState.transactionFilter.of(tr => tr.newDoc.lines > 1 ? [] : tr),
                        editorPlaceholder(this.placeholder),
                        this.variableCompartment.of(this.variableExtension()),
                        EditorView.updateListener.of(update => {
                            if (update.docChanged) {
                                this.$emit('update:modelValue', update.state.doc.toString());
                                const pos = update.state.selection.main.head;
                                if (update.state.sliceDoc(Math.max(0, pos - 2), pos) === '{{') {
                                    queueMicrotask(() => { if (this.editor) startCompletion(this.editor); });
                                }
                            }
                        })
                    ]
                }),
                parent: this.$refs.editorEl
            });
        },
        variableExtension() {
            const names = new Set(this.variables.filter(item => item.enabled !== false).map(item => item.key));
            const matcher = new MatchDecorator({
                regexp: /\{\{[^{}\r\n]+\}\}/g,
                decoration: match => Decoration.mark({ class: names.has(match[0].slice(2, -2).trim()) ? 'variable-defined' : 'variable-undefined' })
            });
            const suggestions = this.variables.filter(item => item.enabled !== false && item.key).map(item => ({
                label: item.key,
                apply: `${item.key}}}`
            }));
            const completion = autocompletion({ override: [context => {
                const match = context.matchBefore(/\{\{[^{}\s]*/);
                if (!match) return null;
                return { from: match.from + 2, options: suggestions };
            }] });
            const highlighting = ViewPlugin.fromClass(class {
                constructor(view) { this.decorations = matcher.createDeco(view); }
                update(update) { this.decorations = matcher.updateDeco(update, this.decorations); }
            }, { decorations: plugin => plugin.decorations });
            const variables = this.variables;
            const tooltip = hoverTooltip((view, pos) => {
                const line = view.state.doc.lineAt(pos);
                const matches = line.text.matchAll(/\{\{([^{}\r\n]+)\}\}/g);
                for (const match of matches) {
                    const from = line.from + match.index;
                    const to = from + match[0].length;
                    if (pos < from || pos > to) continue;
                    const item = variables.find(entry => entry.enabled !== false && entry.key === match[1].trim());
                    if (!item || item.hidden || item.type === 'secret') return null;
                    return { pos: from, end: to, above: true, create() {
                        const dom = document.createElement('div');
                        dom.className = 'variable-tooltip';
                        dom.textContent = String(item.value ?? '');
                        return { dom };
                    } };
                }
                return null;
            });
            return [highlighting, completion, tooltip];
        },
        updateVariables() {
            if (this.editor) this.editor.dispatch({ effects: this.variableCompartment.reconfigure(this.variableExtension()) });
        }
    }
};
</script>

<style lang="scss" scoped>
.variable-input {
    display: flex; align-items: center; min-width: 0; width: 100%;
    border: 1px solid var(--ph-border); border-radius: 8px; background: var(--ph-surface);
    color: var(--ph-text);
    &:focus-within { border-color: var(--ph-accent, #0078d4); }
    input { min-width: 0; width: 100%; height: 32px; padding: 0 9px; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; }
    .variable-editor { flex: 1; min-width: 0; }
    .reveal-button { border: 0; background: transparent; color: inherit; cursor: pointer; padding: 8px; }
    :deep(.cm-editor) { font: inherit; min-width: 0; }
    :deep(.cm-editor.cm-focused) { outline: none; }
    :deep(.cm-scroller) { font-family: inherit; overflow: auto; }
    :deep(.cm-content) { padding: 6px 8px; white-space: pre; }
    :deep(.cm-gutters) { display: none; }
    :deep(.cm-activeLine) { background: transparent; }
    :deep(.variable-tooltip) { max-width: 320px; padding: 6px 8px; overflow-wrap: anywhere; color: var(--ph-text); background: var(--ph-surface); }
    :deep(.variable-defined) { color: #7850b8; background: rgba(145, 100, 210, .18); border-radius: 3px; }
    :deep(.variable-undefined) { color: #cf3030; background: rgba(230, 80, 80, .18); border-radius: 3px; }
}
</style>
