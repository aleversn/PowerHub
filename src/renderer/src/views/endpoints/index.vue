<template>
    <div class="page-stack endpoints-page">
        <sectionCard
            :title="local('API Requests')"
            :description="
                local(
                    'Manage HTTP requests, default headers, and monitor health.'
                )
            "
        >
            <template #info>
                <div class="collection-toolbar">
                    <fv-text-box
                        v-model="keyword"
                        :theme="resolvedTheme"
                        :placeholder="local('Search')"
                        icon="Search"
                        border-radius="8"
                        :reveal-border="true"
                        :reveal-border-color="[color]"
                        :reveal-background-color="['rgba(200, 200, 200, 0.1)']"
                        style="width: min(340px, 100%)"
                    ></fv-text-box>
                    <span class="record-count">
                        {{ filteredEndpointCount }} {{ local('Endpoints') }}
                    </span>
                </div>
            </template>
            <template #actions>
                <div class="toolbar-actions">
                    <fv-button
                        :background="subColor"
                        border-radius="8"
                        :title="local('New collection')"
                        style="width: 32px; height: 34px"
                        @click="showCollectionCreator = !showCollectionCreator"
                    >
                        <i class="ms-Icon ms-Icon--OEM"></i>
                    </fv-button>
                    <fv-button
                        theme="dark"
                        :background="'linear-gradient(90deg, rgba(233, 155, 89, 1), rgba(255, 196, 0, 1))'"
                        border-radius="8"
                        style="width: 32px; height: 34px"
                        :title="local('New endpoint')"
                        @click="createEndpoint()"
                    >
                        <i class="ms-Icon ms-Icon--Add"></i>
                    </fv-button>
                </div>
            </template>

            <div v-if="showCollectionCreator" class="collection-creator">
                <emoji-callout
                    :model-value="newCollectionEmoji"
                    :theme="resolvedTheme"
                    @insert-emoji="newCollectionEmoji = $event"
                ></emoji-callout>
                <fv-text-box
                    v-model="newCollectionName"
                    :theme="resolvedTheme"
                    :placeholder="local('Collection name')"
                    border-radius="8"
                    style="min-width: 240px; flex: 1"
                    @keyup.enter="createCollection"
                ></fv-text-box>
                <fv-button
                    :theme="resolvedTheme"
                    background="#0078d4"
                    foreground="#ffffff"
                    border-radius="8"
                    style="height: 34px"
                    @click="createCollection"
                >
                    {{ local('Create') }}
                </fv-button>
                <fv-button
                    :theme="resolvedTheme"
                    border-radius="8"
                    style="height: 34px"
                    @click="cancelCreateCollection"
                >
                    {{ local('Cancel') }}
                </fv-button>
            </div>

            <div v-if="errorMessage" class="endpoint-alert">
                {{ errorMessage }}
            </div>

            <div v-if="!filteredGroups.length" class="empty-state">
                <i class="ms-Icon ms-Icon--Inbox"></i>
                <strong>{{ local('No endpoints yet') }}</strong>
                <span>{{
                    local('Create an endpoint to start testing live requests.')
                }}</span>
            </div>

            <div v-else class="collection-list">
                <fv-collapse
                    v-for="group in filteredGroups"
                    :key="group.id"
                    :theme="resolvedTheme"
                    :title="group.name"
                    :content="collectionSummary(group)"
                    :model-value="isGroupExpanded(group)"
                    :background="collapseBackground"
                    :hover-background="collapseHoverBackground"
                    :border-color="collapseBorderColor"
                    :default-height="76"
                    :max-height="'auto'"
                    :visible-overflow="true"
                    class="collection-collapse"
                    @update:model-value="setGroupExpanded(group, $event)"
                >
                    <template #icon>
                        <span class="collection-emoji-picker" @click.stop>
                            <emoji-callout
                                :model-value="collectionIconValue(group)"
                                :theme="resolvedTheme"
                                @insert-emoji="
                                    pickCollectionEmoji(group, $event)
                                "
                            ></emoji-callout>
                        </span>
                    </template>

                    <template #extension>
                        <div class="collection-extension" @click.stop>
                            <template v-if="renamingCollectionId === group.id">
                                <fv-text-box
                                    v-model="renamingCollectionName"
                                    :theme="resolvedTheme"
                                    :placeholder="local('Collection name')"
                                    border-radius="8"
                                    style="width: 190px"
                                    @keyup.enter="saveCollectionName(group)"
                                ></fv-text-box>
                                <fv-button
                                    :theme="resolvedTheme"
                                    border-radius="8"
                                    style="height: 32px"
                                    @click="saveCollectionName(group)"
                                >
                                    {{ local('Save') }}
                                </fv-button>
                                <fv-button
                                    :theme="resolvedTheme"
                                    border-radius="8"
                                    style="height: 32px"
                                    @click="cancelRenameCollection"
                                >
                                    {{ local('Cancel') }}
                                </fv-button>
                            </template>
                            <template v-else>
                                <fv-button
                                    :background="subColor"
                                    border-radius="8"
                                    style="width: 32px; height: 32px"
                                    :title="local('Add endpoint')"
                                    @click="createEndpoint(group.name)"
                                >
                                    <i class="ms-Icon ms-Icon--Add"></i>
                                </fv-button>
                                <fv-button
                                    :theme="resolvedTheme"
                                    border-radius="8"
                                    style="width: 34px; height: 32px"
                                    :title="local('Rename')"
                                    @click="beginRenameCollection(group)"
                                >
                                    <i class="ms-Icon ms-Icon--Edit"></i>
                                </fv-button>
                                <fv-button
                                    v-if="group.name !== DEFAULT_COLLECTION"
                                    theme="dark"
                                    background="rgba(200, 38, 45, 1)"
                                    border-radius="8"
                                    style="width: 34px; height: 32px"
                                    :title="local('Delete')"
                                    @click="deleteCollection(group)"
                                >
                                    <i class="ms-Icon ms-Icon--Delete"></i>
                                </fv-button>
                            </template>
                        </div>
                    </template>

                    <div class="endpoint-list">
                        <div
                            v-for="endpoint in group.endpoints"
                            :key="endpoint.id"
                            class="endpoint-row"
                            role="button"
                            tabindex="0"
                            @click="openEndpoint(endpoint)"
                            @keyup.enter="openEndpoint(endpoint)"
                        >
                            <span
                                class="method-badge"
                                :class="endpoint.method.toLowerCase()"
                            >
                                {{ endpoint.method }}
                            </span>

                            <div class="endpoint-main">
                                <strong>{{ endpoint.name }}</strong>
                                <span>{{
                                    endpoint.url || local('No URL yet')
                                }}</span>
                            </div>

                            <statusPill
                                :status="endpoint.health"
                                style="width: 60px"
                            />

                            <fv-toggle-switch
                                :model-value="endpoint.enabled"
                                :theme="resolvedTheme"
                                :width="90"
                                :height="20"
                                :switch-on-background="subColor"
                                :inside-content="true"
                                @click.stop
                                @update:model-value="
                                    toggleEndpoint(endpoint.id)
                                "
                            ></fv-toggle-switch>

                            <div class="endpoint-actions" @click.stop>
                                <fv-button
                                    :theme="resolvedTheme"
                                    border-radius="8"
                                    style="width: 32px; height: 32px"
                                    :title="local('Move up')"
                                    :disabled="
                                        !canMoveWithinCollection(
                                            group,
                                            endpoint,
                                            -1
                                        )
                                    "
                                    @click="
                                        moveWithinCollection(
                                            group,
                                            endpoint,
                                            -1
                                        )
                                    "
                                >
                                    <i class="ms-Icon ms-Icon--Up"></i>
                                </fv-button>
                                <fv-button
                                    :theme="resolvedTheme"
                                    border-radius="8"
                                    style="width: 32px; height: 32px"
                                    :title="local('Move down')"
                                    :disabled="
                                        !canMoveWithinCollection(
                                            group,
                                            endpoint,
                                            1
                                        )
                                    "
                                    @click="
                                        moveWithinCollection(group, endpoint, 1)
                                    "
                                >
                                    <i class="ms-Icon ms-Icon--Down"></i>
                                </fv-button>
                                <fv-button
                                    :background="subColor"
                                    border-radius="8"
                                    style="width: 32px; height: 32px"
                                    :title="local('Send')"
                                    :disabled="
                                        sendingEndpointId === endpoint.id
                                    "
                                    @click="sendEndpoint(endpoint)"
                                >
                                    <i
                                        class="ms-Icon"
                                        :class="
                                            sendingEndpointId === endpoint.id
                                                ? 'ms-Icon--Sync'
                                                : 'ms-Icon--Play'
                                        "
                                    ></i>
                                </fv-button>
                                <fv-button
                                    :background="subColor"
                                    border-radius="8"
                                    style="width: 32px; height: 32px"
                                    :title="local('Duplicate')"
                                    @click="duplicateEndpoint(endpoint.id)"
                                >
                                    <i class="ms-Icon ms-Icon--Set"></i>
                                </fv-button>
                                <fv-drop-down
                                    :model-value="collectionSelection(endpoint)"
                                    :options="moveOptions"
                                    :theme="resolvedTheme"
                                    border-radius="8"
                                    input-height="32px"
                                    input-font-size="10px"
                                    :drop-down-font-size="10"
                                    style="width: 150px"
                                    @update:model-value="
                                        moveToCollection(endpoint, $event)
                                    "
                                ></fv-drop-down>
                                <fv-button
                                    theme="dark"
                                    :background="'rgba(200, 38, 45, 1)'"
                                    border-radius="8"
                                    style="width: 32px; height: 32px"
                                    :title="local('Delete')"
                                    @click="deleteEndpoint(endpoint)"
                                >
                                    <i class="ms-Icon ms-Icon--Delete"></i>
                                </fv-button>
                            </div>
                        </div>

                        <div
                            v-if="!group.endpoints.length"
                            class="collection-empty"
                        >
                            {{ local('No endpoints yet') }}
                        </div>
                    </div>
                </fv-collapse>
            </div>
        </sectionCard>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import statusPill from '@/components/common/statusPill.vue';
import emojiCallout from '@/components/general/callout/emojiCallout.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useWorkspaceStore } from '@/stores/workspace';
import { useThemeStore } from '@/stores/theme';

const DEFAULT_COLLECTION = 'Default collection';

export default {
    name: 'EndpointsView',
    components: {
        sectionCard,
        statusPill,
        emojiCallout
    },
    data() {
        return {
            DEFAULT_COLLECTION,
            keyword: '',
            showCollectionCreator: false,
            newCollectionName: '',
            newCollectionEmoji: '',
            expandedGroups: {},
            renamingCollectionId: '',
            renamingCollectionName: '',
            sendingEndpointId: '',
            errorMessage: ''
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local']),
        ...mapState(useThemeStore, ['color', 'subColor', 'gradient']),
        ...mapState(useWorkspaceStore, {
            workspaceEndpointGroups: 'collectionGroups',
            collections: 'collections'
        }),
        collapseBackground() {
            return this.resolvedTheme === 'dark'
                ? 'rgba(23, 29, 39, 0.6)'
                : 'rgba(255, 255, 255, 0.72)';
        },
        collapseHoverBackground() {
            return this.resolvedTheme === 'dark'
                ? 'rgba(19, 24, 35, 1)'
                : 'rgba(255, 255, 255, 0.96)';
        },
        collapseBorderColor() {
            return this.resolvedTheme === 'dark'
                ? 'rgba(120, 120, 120, 0.2)'
                : 'rgba(0, 0, 0, 0.08)';
        },
        moveOptions() {
            return this.collections.map((collection) => ({
                key: collection.name,
                text: collection.name
            }));
        },
        filteredGroups() {
            const search = this.keyword.trim().toLowerCase();
            const groups = this.workspaceEndpointGroups
                .map((group) => ({
                    ...group,
                    endpoints: [...group.endpoints].sort(
                        (left, right) =>
                            Number(left.sortOrder || 0) -
                            Number(right.sortOrder || 0)
                    )
                }))
                .sort(
                    (left, right) =>
                        Number(left.sortOrder || 0) -
                        Number(right.sortOrder || 0)
                );
            if (!search) return groups;
            return groups
                .map((group) => ({
                    ...group,
                    endpoints: group.endpoints.filter((endpoint) =>
                        [
                            endpoint.name,
                            endpoint.url,
                            endpoint.collection,
                            endpoint.method
                        ]
                            .join(' ')
                            .toLowerCase()
                            .includes(search)
                    )
                }))
                .filter((group) => group.endpoints.length);
        },
        filteredEndpointCount() {
            return this.filteredGroups.reduce(
                (count, group) => count + group.endpoints.length,
                0
            );
        }
    },
    mounted() {
        this.workspaceInitialize();
    },
    methods: {
        ...mapActions(useWorkspaceStore, {
            workspaceInitialize: 'initialize',
            addEndpoint: 'addEndpoint',
            updateEndpoint: 'updateEndpoint',
            duplicateEndpoint: 'duplicateEndpoint',
            toggleEndpoint: 'toggleEndpoint',
            moveEndpoint: 'moveEndpoint',
            removeEndpoint: 'removeEndpoint',
            addCollection: 'addCollection',
            updateCollection: 'updateCollection',
            removeCollection: 'removeCollection',
            runEndpoint: 'runEndpoint'
        }),
        collectionSummary(group) {
            return `${group.endpoints.length} ${this.local('Endpoints')}`;
        },
        collectionEmoji(group) {
            if (group.emoji) return group.emoji;
            return group.name === DEFAULT_COLLECTION ? '🏠' : '📁';
        },
        // 左侧图标即选择器：无 emoji 时展示默认图标，但不要触发保存。
        collectionIconValue(group) {
            return this.collectionEmoji(group);
        },
        async pickCollectionEmoji(group, emoji) {
            if (!emoji || emoji === this.collectionEmoji(group)) return;
            const result = await this.updateCollection(group.id, { emoji });
            if (!result.ok) this.errorMessage = result.message;
        },
        isGroupExpanded(group) {
            return this.expandedGroups[group.id] !== false;
        },
        setGroupExpanded(group, value) {
            this.expandedGroups = {
                ...this.expandedGroups,
                [group.id]: Boolean(value)
            };
        },
        collectionSelection(endpoint) {
            const option = this.moveOptions.find(
                (item) => item.key === endpoint.collection
            );
            return option ? [option] : [];
        },
        async createEndpoint(collection = DEFAULT_COLLECTION) {
            const result = await this.addEndpoint({
                name: 'Untitled endpoint',
                method: 'GET',
                url: '',
                collection: collection || DEFAULT_COLLECTION
            });
            if (!result.ok) {
                this.errorMessage = result.message;
                return;
            }
            this.openEndpoint(result.endpoint);
        },
        openEndpoint(endpoint) {
            this.$router.push({
                name: 'endpoint-editor',
                params: { id: endpoint.id }
            });
        },
        async sendEndpoint(endpoint) {
            this.sendingEndpointId = endpoint.id;
            const result = await this.runEndpoint(
                endpoint.id,
                {},
                null,
                'manual'
            );
            this.sendingEndpointId = '';
            if (!result.ok) this.errorMessage = result.message;
        },
        async moveToCollection(endpoint, value) {
            const nextCollection = value?.[0]?.key;
            if (!nextCollection || nextCollection === endpoint.collection)
                return;
            const result = await this.moveEndpoint(endpoint.id, nextCollection);
            if (!result.ok) this.errorMessage = result.message;
        },
        completeGroup(group) {
            return (
                this.workspaceEndpointGroups.find(
                    (item) => item.name === group.name
                ) || group
            );
        },
        canMoveWithinCollection(group, endpoint, direction) {
            const endpoints = [...this.completeGroup(group).endpoints].sort(
                (left, right) =>
                    Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
            );
            const currentIndex = endpoints.findIndex(
                (item) => item.id === endpoint.id
            );
            return (
                currentIndex >= 0 &&
                Boolean(endpoints[currentIndex + direction])
            );
        },
        async moveWithinCollection(group, endpoint, direction) {
            const endpoints = [...this.completeGroup(group).endpoints].sort(
                (left, right) =>
                    Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
            );
            const currentIndex = endpoints.findIndex(
                (item) => item.id === endpoint.id
            );
            const targetIndex = currentIndex + direction;
            if (
                currentIndex < 0 ||
                targetIndex < 0 ||
                targetIndex >= endpoints.length
            ) {
                return;
            }
            const reordered = [...endpoints];
            const [moved] = reordered.splice(currentIndex, 1);
            reordered.splice(targetIndex, 0, moved);
            await Promise.all(
                reordered.map((item, index) =>
                    Number(item.sortOrder) === index
                        ? Promise.resolve({ ok: true })
                        : this.updateEndpoint(item.id, { sortOrder: index })
                )
            );
        },
        async createCollection() {
            const name = this.newCollectionName.trim();
            if (!name) return;
            const result = await this.addCollection({
                name,
                emoji: this.newCollectionEmoji
            });
            if (!result.ok) {
                this.errorMessage = result.message;
                return;
            }
            this.newCollectionName = '';
            this.newCollectionEmoji = '';
            this.showCollectionCreator = false;
        },
        cancelCreateCollection() {
            this.newCollectionName = '';
            this.newCollectionEmoji = '';
            this.showCollectionCreator = false;
        },
        beginRenameCollection(group) {
            this.renamingCollectionId = group.id;
            this.renamingCollectionName = group.name;
        },
        cancelRenameCollection() {
            this.renamingCollectionId = '';
            this.renamingCollectionName = '';
        },
        async saveCollectionName(group) {
            const name = this.renamingCollectionName.trim();
            if (!name || name === group.name) {
                this.cancelRenameCollection();
                return;
            }
            const result = await this.updateCollection(group.id, { name });
            if (!result.ok) {
                this.errorMessage = result.message;
                return;
            }
            this.cancelRenameCollection();
        },
        async deleteCollection(group) {
            if (group.name === DEFAULT_COLLECTION) return;
            const confirmed = window.confirm(
                `${this.local('Delete')} "${group.name}"?`
            );
            if (!confirmed) return;
            const result = await this.removeCollection(group.id);
            if (!result.ok) this.errorMessage = result.message;
        },
        async deleteEndpoint(endpoint) {
            const confirmed = window.confirm(
                `${this.local('Delete')} "${endpoint.name}"?`
            );
            if (!confirmed) return;
            const result = await this.removeEndpoint(endpoint.id);
            if (!result.ok) this.errorMessage = result.message;
        }
    }
};
</script>

<style lang="scss" scoped>
.endpoints-page {
    position: relative;
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    .toolbar-actions,
    .collection-toolbar,
    .collection-creator,
    .collection-extension,
    .endpoint-actions {
        display: flex;
        align-items: center;
        gap: 3px;
    }

    .collection-toolbar {
        margin-bottom: 14px;
        justify-content: space-between;
    }

    .record-count {
        color: var(--ph-text-muted);
        font-size: 11px;
    }

    .collection-creator {
        margin-bottom: 14px;
        padding: 12px;
        border: 1px solid var(--ph-border);
        border-radius: 12px;
        background: var(--ph-surface-soft);
    }

    .endpoint-alert {
        margin-bottom: 14px;
        padding: 10px 12px;
        border: 1px solid rgba(196, 43, 28, 0.25);
        border-radius: 10px;
        background: rgba(196, 43, 28, 0.08);
        color: var(--ph-danger);
        font-size: 12px;
    }

    .collection-list {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .collection-collapse {
        width: 100%;
    }

    .collection-extension {
        justify-content: flex-end;
        flex-wrap: wrap;
    }

    .collection-emoji-picker {
        display: inline-flex;

        :deep(.ph-emoji-trigger) {
            min-width: 30px;
            height: 30px;
            padding: 0 4px;
            border: 0;
            background: transparent;
            font-size: 18px;
        }

        :deep(.ph-emoji-trigger:hover) {
            background: var(--ph-surface-hover);
        }
    }

    .button-label {
        margin-left: 6px;
    }

    .collection-creator,
    .collection-extension {
        :deep(.fv-TextBox) {
            flex: 1;
            min-width: 0;
        }
    }

    .endpoint-list {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px 14px 14px;
    }

    .endpoint-row {
        min-width: 0;
        min-height: 56px;
        padding: 8px 10px;
        border: 1px solid var(--ph-border-subtle);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.44);
        display: grid;
        grid-template-columns: 64px minmax(170px, 1fr) 96px 52px auto;
        align-items: center;
        gap: 12px;
        cursor: pointer;

        &:hover {
            border-color: var(--ph-border);
            background: var(--ph-surface-hover);
        }
    }

    .endpoint-main {
        min-width: 0;
        display: flex;
        flex-direction: column;

        strong,
        span {
            @include nowrap;
        }

        strong {
            color: var(--ph-text);
            font-size: 13px;
            font-weight: 600;
        }

        span {
            margin-top: 4px;
            color: var(--ph-text-muted);
            font-size: 10px;
        }
    }

    .method-badge {
        width: auto;
        min-width: max-content;
        padding: 4px 7px;
        border-radius: 6px;
        background: rgba(16, 124, 16, 0.1);
        color: var(--ph-success);
        font-size: 10px;
        font-weight: 700;
        text-align: center;
        display: flex;
        justify-content: center;

        &.post,
        &.put,
        &.patch {
            background: rgba(0, 120, 212, 0.1);
            color: var(--ph-accent);
        }

        &.delete {
            background: rgba(196, 43, 28, 0.1);
            color: var(--ph-danger);
        }
    }

    .collection-empty,
    .empty-state {
        color: var(--ph-text-muted);
        font-size: 12px;
    }

    .collection-empty {
        padding: 12px;
        border: 1px dashed var(--ph-border);
        border-radius: 10px;
    }

    .empty-state {
        min-height: 220px;
        border: 1px dashed var(--ph-border);
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;

        .ms-Icon {
            font-size: 28px;
        }

        strong {
            color: var(--ph-text);
            font-size: 14px;
        }
    }

    @media (max-width: 1180px) {
        .endpoint-row {
            grid-template-columns: 64px minmax(150px, 1fr) 90px 48px;
        }

        .endpoint-actions {
            grid-column: 1 / -1;
            justify-content: flex-end;
            flex-wrap: wrap;
        }
    }

    @media (max-width: 760px) {
        .toolbar-actions,
        .collection-toolbar,
        .collection-creator,
        .endpoint-actions {
            align-items: stretch;
            flex-direction: column;
        }

        .collection-extension {
            align-items: stretch;
            flex-direction: column;
        }

        .endpoint-row {
            grid-template-columns: 1fr;
        }
    }
}
</style>
