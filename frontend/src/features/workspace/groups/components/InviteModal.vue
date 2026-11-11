<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseModal from '../../components/BaseModal.vue'
import { useToast } from '../../composables/useToast'
import { useGroups } from '../useGroups'
import MemberSelect from './MemberSelect.vue'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ groupId: string }>()

const store = useGroups()
const toast = useToast()
const group = computed(() => store.group(props.groupId))
const picked = ref<string[]>([])
const code = ref('')
const hours = ref<number | null>(168)

const existing = computed(() => group.value?.members.map((m) => m.userId) ?? [])
const link = computed(() => (code.value ? `taskflow.app/invite/${code.value}` : ''))

watch(open, (isOpen) => {
  if (!isOpen) return
  picked.value = []
  code.value = group.value?.invites[0]?.code ?? ''
})

function generate(): void {
  const r = store.createInvite(props.groupId, { hours: hours.value, maxUses: null })
  if (r.ok) code.value = r.value
  else toast.show(r.error, 'error')
}

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(link.value)
    toast.show('Đã sao chép liên kết mời.')
  } catch {
    toast.show('Không sao chép được, hãy chọn và sao chép thủ công.', 'error')
  }
}

function add(): void {
  const r = store.addMembers(props.groupId, picked.value, 'invite')
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  toast.show(`Đã thêm ${r.value} thành viên vào ${group.value?.name}.`)
  open.value = false
}
</script>

<template>
  <BaseModal v-model:open="open" :title="`Mời vào ${group?.name ?? 'nhóm'}`" description="Thêm trực tiếp người quen hoặc gửi liên kết mời.">
    <MemberSelect v-model="picked" :exclude="existing" label="Thêm người trong danh bạ" />

    <div class="link">
      <span class="ws-label">Liên kết mời</span>
      <div class="link__row">
        <input class="ws-input" :value="link || 'Chưa có liên kết'" readonly aria-label="Liên kết mời" data-test="invite-link" />
        <BaseButton v-if="link" variant="secondary" class="ws-btn-auto" @click="copy"><AppIcon name="copy" :size="16" /> Sao chép</BaseButton>
      </div>
      <div class="link__row link__row--small">
        <label for="inv-exp" class="link__label">Hết hạn sau</label>
        <select id="inv-exp" v-model="hours" class="ws-input link__select">
          <option :value="24">1 ngày</option>
          <option :value="168">7 ngày</option>
          <option :value="null">Không bao giờ</option>
        </select>
        <button type="button" class="link__new" data-test="invite-generate" @click="generate">
          <AppIcon name="link" :size="15" /> Tạo liên kết mới
        </button>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" class="ws-btn-auto" @click="open = false">Đóng</BaseButton>
      <BaseButton class="ws-btn-auto" :disabled="!picked.length" data-test="invite-add" @click="add">
        Thêm {{ picked.length || '' }} người
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.link {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--ws-border);
}

.link__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.link__row :deep(.btn__label) {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.link__row--small {
  margin-top: 0.625rem;
}

.link__label {
  color: var(--ws-text-3);
  font-size: 0.8125rem;
  white-space: nowrap;
}

.link__select {
  width: auto;
  height: 2.25rem;
}

.link__new {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: auto;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ws-accent-text);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
}
</style>
