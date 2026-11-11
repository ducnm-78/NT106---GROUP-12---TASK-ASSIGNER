<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import { useProfile } from '../composables/useProfile'
import { toAvatarDataUrl, validateAvatar } from '../utils/image'
import BaseModal from './BaseModal.vue'
import UserAvatar from './UserAvatar.vue'

const open = defineModel<boolean>('open', { required: true })

const { profile, initials, update } = useProfile()

const preview = ref<string | null>(null)
const fileName = ref('')
const error = ref('')
const dragging = ref(false)
const processing = ref(false)
const input = ref<HTMLInputElement | null>(null)

watch(open, (isOpen) => {
  if (isOpen) {
    preview.value = profile.value.avatar
    fileName.value = ''
    error.value = ''
  }
})

async function handleFile(file: File | undefined): Promise<void> {
  if (!file) return
  error.value = validateAvatar(file)
  if (error.value) return
  processing.value = true
  try {
    preview.value = await toAvatarDataUrl(file)
    fileName.value = file.name
  } catch {
    error.value = 'Không đọc được ảnh này. Hãy thử ảnh khác.'
  } finally {
    processing.value = false
  }
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  void handleFile(event.dataTransfer?.files[0])
}

function onPick(event: Event): void {
  const target = event.target as HTMLInputElement
  void handleFile(target.files?.[0])
  target.value = ''
}

function save(): void {
  update({ avatar: preview.value })
  open.value = false
}
</script>

<template>
  <BaseModal v-model:open="open" title="Đổi ảnh đại diện" description="Tải ảnh JPG hoặc PNG, dung lượng tối đa 5 MB.">
    <div class="avatar-edit">
      <div class="avatar-edit__preview">
        <UserAvatar :initials="initials" :src="preview" size="8.5rem" />
      </div>

      <div
        class="drop"
        :class="{ 'is-dragging': dragging, 'is-error': error }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="onDrop"
      >
        <AppIcon name="upload" :size="22" />
        <p class="drop__text">
          Kéo thả ảnh vào đây hoặc
          <button type="button" class="drop__pick" @click="input?.click()">chọn tệp</button>
        </p>
        <p v-if="processing" class="drop__hint">Đang xử lí ảnh…</p>
        <p v-else-if="error" class="drop__hint drop__hint--error" role="alert">{{ error }}</p>
        <p v-else-if="fileName" class="drop__hint">Đã chọn: {{ fileName }}</p>
        <input ref="input" type="file" accept="image/jpeg,image/png" class="visually-hidden" tabindex="-1" @change="onPick" />
      </div>

      <button v-if="preview" type="button" class="avatar-edit__remove" @click="preview = null">Gỡ ảnh hiện tại</button>
    </div>

    <template #footer>
      <BaseButton variant="secondary" class="ws-btn-auto" @click="open = false">Huỷ</BaseButton>
      <BaseButton class="ws-btn-auto" :disabled="processing || preview === profile.avatar" @click="save">
        Lưu ảnh đại diện
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.avatar-edit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.avatar-edit__preview {
  padding: 0.375rem;
  border: 3px solid var(--ws-accent);
  border-radius: 50%;
}

.drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1.5rem 1rem;
  border: 2px dashed var(--ws-border-strong);
  border-radius: 1rem;
  color: var(--ws-accent-text);
  text-align: center;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.drop.is-dragging {
  border-color: var(--ws-accent);
  background: var(--ws-accent-soft);
}

.drop.is-error {
  border-color: var(--ws-danger);
}

.drop__text {
  margin: 0;
  color: var(--ws-text);
  font-size: 0.9375rem;
  font-weight: 600;
}

.drop__pick {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ws-accent-text);
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.drop__hint {
  margin: 0;
  color: var(--ws-text-2);
  font-size: 0.8125rem;
}

.drop__hint--error {
  color: var(--ws-danger);
}

.avatar-edit__remove {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ws-text-2);
  font-size: 0.875rem;
  cursor: pointer;
}

.avatar-edit__remove:hover {
  color: var(--ws-danger);
}
</style>
