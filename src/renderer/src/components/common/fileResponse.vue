<template>
    <div class="file-response">
        <img :src="icon" alt="" class="file-icon" />
        <div class="file-info">
            <strong :title="filename">{{ filename }}</strong>
            <span>{{ mime }}<template v-if="file.size != null"> · {{ formatSize(file.size) }}</template></span>
            <span v-if="!file.base64" class="file-notice">{{ local('File data is unavailable for this older record. Send the request again to download it.') }}</span>
            <span v-if="error" class="file-error" role="alert">{{ error }}</span>
        </div>
        <fv-button :theme="resolvedTheme" :disabled="!file.base64" icon="Download" @click="download">{{ local('Download') }}</fv-button>
    </div>
</template>
<script>
import { mapState } from 'pinia';
import { useAppConfigStore } from '@/stores/appConfig';

const icons = import.meta.glob('@/assets/fileTypes/*.svg', { eager: true, query: '?url', import: 'default' });
const extensions = { 'application/pdf': 'pdf', 'application/zip': 'zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx', 'application/msword': 'doc', 'application/vnd.ms-excel': 'xls', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' };
export default {
    name: 'FileResponse',
    props: { file: { type: Object, default: () => ({}) } },
    data() { return { error: '' }; },
    computed: {
        ...mapState(useAppConfigStore, ['local', 'resolvedTheme']),
        mime() { return String(this.file.contentType || 'application/octet-stream').split(';')[0]; },
        filename() {
            const disposition = String(this.file.disposition || '');
            const encoded = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
            const plain = disposition.match(/filename\s*=\s*(?:"([^"]*)"|([^;]*))/i);
            let name = plain?.[1] || plain?.[2]?.trim() || '';
            if (encoded) { try { name = decodeURIComponent(encoded[1].trim()); } catch { /* Use the plain filename. */ } }
            name = Array.from(name, char => char === '/' || char === '\\' || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? '_' : char).join('').trim();
            return name || `download${extensions[this.mime.toLowerCase()] ? `.${extensions[this.mime.toLowerCase()]}` : ''}`;
        },
        icon() {
            const extension = this.filename.includes('.') ? this.filename.split('.').pop().toLowerCase() : extensions[this.mime.toLowerCase()];
            return icons[`/src/assets/fileTypes/${extension}.svg`] || icons['/src/assets/fileTypes/other.svg'];
        }
    },
    methods: {
        formatSize(size) { if (size < 1024) return `${size} B`; if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`; return `${(size / 1048576).toFixed(1)} MB`; },
        download() {
            this.error = '';
            try {
                const bytes = Uint8Array.from(atob(this.file.base64), char => char.charCodeAt(0));
                const url = URL.createObjectURL(new Blob([bytes], { type: this.mime }));
                const link = document.createElement('a');
                link.href = url; link.download = this.filename; link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch { this.error = this.local('Could not download the file.'); }
        }
    }
};
</script>
<style lang="scss" scoped>
.file-response { display: flex; align-items: center; gap: 14px; min-width: 0; padding: 16px; border: 1px solid var(--ph-border-subtle); border-radius: 12px; background: var(--ph-surface-soft); }
.file-icon { width: 40px; height: 40px; flex: none; object-fit: contain; }
.file-info { display: flex; flex: 1; flex-direction: column; gap: 4px; min-width: 0; color: var(--ph-text-muted); font-size: 12px; }
.file-info strong { overflow: hidden; color: var(--ph-text); text-overflow: ellipsis; white-space: nowrap; }
.file-notice { overflow-wrap: anywhere; }
.file-error { color: var(--ph-danger); }
@media (max-width: 640px) { .file-response { flex-wrap: wrap; } .file-response :deep(.fv-Button) { margin-left: 54px; } }
</style>
