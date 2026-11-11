<script setup lang="ts">
/* Các mục quản trị gọn: Lời mời, Kiểm duyệt tự động, Danh sách cấm, Nhật ký. */
import { computed, ref } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import ToggleSwitch from '../../components/ToggleSwitch.vue'
import { useToast } from '../../composables/useToast'
import { formatDate, formatMessageTime } from '../format'
import { useGroups } from '../useGroups'
import type { Group } from '../types'
import PersonAvatar from '../components/PersonAvatar.vue'

const props = defineProps<{ group: Group; section: 'invites' | 'automod' | 'bans' | 'audit' }>()
const store = useGroups()
const toast = useToast()

/* ----- Lời mời ----- */
const hours = ref<number | null>(168)
const maxUses = ref<number | null>(null)

function createInvite(): void {
  const r = store.createInvite(props.group.id, { hours: hours.value, maxUses: maxUses.value })
  if (r.ok) toast.show(`Đã tạo mã mời ${r.value}.`)
  else toast.show(r.error, 'error')
}

function revoke(code: string): void {
  const r = store.revokeInvite(props.group.id, code)
  if (r.ok) toast.show('Đã thu hồi lời mời.')
  else toast.show(r.error, 'error')
}

function expiry(iso: string | null): string {
  if (!iso) return 'Không hết hạn'
  return new Date(iso).getTime() < Date.now() ? 'Đã hết hạn' : `Hết hạn ${formatDate(iso)}`
}

/* ----- Kiểm duyệt ----- */
const isAdmin = computed(() => store.can(props.group.id, 'ADMINISTRATOR'))
const word = ref('')

function patch(p: Partial<Group['automod']>): void {
  const r = store.updateAutomod(props.group.id, p)
  if (!r.ok) toast.show(r.error, 'error')
}

function addWord(): void {
  const w = word.value.trim().toLocaleLowerCase('vi')
  if (!w || props.group.automod.blockedWords.includes(w)) return
  patch({ blockedWords: [...props.group.automod.blockedWords, w] })
  word.value = ''
}

/* ----- Cấm ----- */
function unban(userId: string): void {
  const r = store.unban(props.group.id, userId)
  if (r.ok) toast.show(`Đã gỡ cấm ${store.person(userId).name}.`)
  else toast.show(r.error, 'error')
}

/* ----- Nhật ký ----- */
const auditQuery = ref('')
const audit = computed(() => {
  const q = auditQuery.value.trim().toLocaleLowerCase('vi')
  return props.group.auditLog.filter((a) => !q || `${store.person(a.actorId).name} ${a.action} ${a.target}`.toLocaleLowerCase('vi').includes(q))
})
</script>

<template>
  <!-- ===== Lời mời ===== -->
  <div v-if="section === 'invites'">
    <header class="gs-head">
      <div>
        <h1 class="gs-title">Lời mời</h1>
        <p class="gs-desc">Mã mời cho phép người khác tự tham gia nhóm qua mục “Tham gia nhóm”.</p>
      </div>
    </header>
    <form class="gs-card inv-form" novalidate @submit.prevent="createInvite">
      <div>
        <label class="ws-label" for="inv-h">Hết hạn sau</label>
        <select id="inv-h" v-model="hours" class="ws-input">
          <option :value="1">1 giờ</option>
          <option :value="24">1 ngày</option>
          <option :value="168">7 ngày</option>
          <option :value="null">Không bao giờ</option>
        </select>
      </div>
      <div>
        <label class="ws-label" for="inv-m">Số lượt dùng tối đa</label>
        <select id="inv-m" v-model="maxUses" class="ws-input">
          <option :value="null">Không giới hạn</option>
          <option :value="1">1 lượt</option>
          <option :value="10">10 lượt</option>
          <option :value="50">50 lượt</option>
        </select>
      </div>
      <button type="submit" class="gs-btn gs-btn--primary" data-test="invite-create"><AppIcon name="link" :size="16" /> Tạo mã mời</button>
    </form>
    <section class="gs-card">
      <ul class="rows" data-test="invite-list">
        <li v-for="inv in group.invites" :key="inv.code" class="gs-row">
          <code class="code">{{ inv.code }}</code>
          <div class="gs-row__text">
            <strong>Tạo bởi {{ store.person(inv.createdBy).name }}</strong>
            <small>{{ inv.uses }}{{ inv.maxUses ? `/${inv.maxUses}` : '' }} lượt dùng · {{ expiry(inv.expiresAt) }}</small>
          </div>
          <button type="button" class="gs-btn gs-btn--danger gs-btn--sm" @click="revoke(inv.code)">Thu hồi</button>
        </li>
        <li v-if="!group.invites.length" class="gs-empty">Chưa có mã mời nào.</li>
      </ul>
    </section>
  </div>

  <!-- ===== Kiểm duyệt tự động ===== -->
  <div v-else-if="section === 'automod'">
    <header class="gs-head">
      <div>
        <h1 class="gs-title">Kiểm duyệt tự động</h1>
        <p class="gs-desc">Tự chặn tin nhắn vi phạm trước khi được gửi vào kênh.</p>
      </div>
    </header>
    <p v-if="!isAdmin" class="gs-notice" style="margin-bottom: 1rem"><AppIcon name="lock" :size="16" /> Chỉ quản trị viên mới thay đổi được.</p>
    <fieldset class="gs-card plain" :disabled="!isAdmin">
      <div class="gs-row">
        <div class="gs-row__text">
          <strong>Bật kiểm duyệt</strong>
          <small>Áp dụng các quy tắc bên dưới cho mọi kênh văn bản.</small>
        </div>
        <ToggleSwitch :model-value="group.automod.enabled" label="Bật kiểm duyệt" data-test="automod-enabled" @update:model-value="patch({ enabled: $event })" />
      </div>
      <div class="gs-row">
        <div class="gs-row__text">
          <strong>Chặn liên kết</strong>
          <small>Không cho gửi tin nhắn chứa đường dẫn http/www.</small>
        </div>
        <ToggleSwitch :model-value="group.automod.blockLinks" label="Chặn liên kết" data-test="automod-links" @update:model-value="patch({ blockLinks: $event })" />
      </div>
      <div class="gs-row">
        <div class="gs-row__text">
          <strong>Giới hạn lượt nhắc</strong>
          <small>Số @nhắc tối đa trong một tin nhắn.</small>
        </div>
        <input
          class="ws-input num"
          type="number"
          min="1"
          max="50"
          :value="group.automod.maxMentions"
          aria-label="Số lượt nhắc tối đa"
          @change="patch({ maxMentions: Math.max(1, Math.min(50, Number(($event.target as HTMLInputElement).value) || 5)) })"
        />
      </div>
      <div class="words">
        <strong>Từ bị chặn</strong>
        <ul class="words__list">
          <li v-for="w in group.automod.blockedWords" :key="w" class="ws-chip">
            {{ w }}
            <button type="button" :aria-label="`Bỏ chặn ${w}`" @click="patch({ blockedWords: group.automod.blockedWords.filter((x) => x !== w) })">
              <AppIcon name="x" :size="12" />
            </button>
          </li>
          <li v-if="!group.automod.blockedWords.length" class="words__empty">Chưa có từ nào.</li>
        </ul>
        <form class="words__form" novalidate @submit.prevent="addWord">
          <input
            v-model="word"
            class="ws-input"
            maxlength="30"
            placeholder="Thêm từ cần chặn"
            aria-label="Thêm từ cần chặn"
            data-test="automod-word"
            @keydown.enter.prevent="addWord"
          />
          <button type="submit" class="gs-btn" :disabled="!word.trim()" data-test="automod-add">Thêm</button>
        </form>
      </div>
    </fieldset>
  </div>

  <!-- ===== Danh sách cấm ===== -->
  <div v-else-if="section === 'bans'">
    <header class="gs-head">
      <div>
        <h1 class="gs-title">Danh sách cấm</h1>
        <p class="gs-desc">{{ group.bans.length }} người đang bị cấm khỏi nhóm.</p>
      </div>
    </header>
    <section class="gs-card">
      <ul class="rows" data-test="ban-list">
        <li v-for="b in group.bans" :key="b.userId" class="gs-row">
          <PersonAvatar :person="store.person(b.userId)" :size="36" />
          <div class="gs-row__text">
            <strong>{{ store.person(b.userId).name }}</strong>
            <small>Bị cấm {{ formatDate(b.at) }} bởi {{ store.person(b.by).name }}{{ b.reason ? ` · “${b.reason}”` : '' }}</small>
          </div>
          <button type="button" class="gs-btn gs-btn--sm" :data-test="`unban-${b.userId}`" @click="unban(b.userId)">Gỡ cấm</button>
        </li>
        <li v-if="!group.bans.length" class="gs-empty">Không có ai bị cấm. 🎉</li>
      </ul>
    </section>
  </div>

  <!-- ===== Nhật ký ===== -->
  <div v-else>
    <header class="gs-head">
      <div>
        <h1 class="gs-title">Nhật ký hoạt động</h1>
        <p class="gs-desc">Mọi thay đổi về kênh, vai trò và thành viên của nhóm.</p>
      </div>
    </header>
    <div class="gs-toolbar">
      <div class="gs-search">
        <AppIcon name="search" :size="16" />
        <input v-model="auditQuery" class="ws-input" type="search" placeholder="Tìm trong nhật ký" aria-label="Tìm trong nhật ký" />
      </div>
    </div>
    <section class="gs-card">
      <ol class="rows" data-test="audit-list">
        <li v-for="a in audit" :key="a.id" class="gs-row">
          <span class="audit-icon"><AppIcon :name="a.icon" :size="16" /></span>
          <div class="gs-row__text">
            <span>
              <strong>{{ store.person(a.actorId).name }}</strong> {{ a.action }} <strong>{{ a.target }}</strong>
            </span>
            <small>{{ formatMessageTime(a.at) }}</small>
          </div>
        </li>
        <li v-if="!audit.length" class="gs-empty">Chưa có hoạt động nào.</li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.inv-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: end;
  gap: 1rem;
  margin-bottom: 1rem;
}

.code {
  padding: 0.375rem 0.625rem;
  border-radius: 0.5rem;
  background: var(--ws-surface-2);
  color: var(--ws-accent-text);
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.875rem;
  font-weight: 700;
}

.plain {
  min-width: 0;
  margin: 0;
}

.plain:disabled {
  opacity: 0.75;
}

.num {
  width: 5.5rem;
}

.words {
  padding-top: 0.875rem;
  border-top: 1px solid var(--ws-border);
}

.words strong {
  font-size: 0.9375rem;
}

.words__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0.625rem 0;
  padding: 0;
  list-style: none;
}

.words__list button {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ws-text-3);
  cursor: pointer;
}

.words__empty {
  color: var(--ws-text-3);
  font-size: 0.8125rem;
}

.words__form {
  display: flex;
  gap: 0.5rem;
}

.audit-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
}

.gs-row__text span {
  font-size: 0.9375rem;
}

.gs-row__text span strong {
  font-weight: 700;
}

@media (max-width: 40rem) {
  .inv-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
