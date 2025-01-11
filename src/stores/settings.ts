import { acceptHMRUpdate, defineStore } from 'pinia'
import { isDark } from '~/composables/dark'

interface SettingsState {
  apiKey: string
  baseUrl: string
  userName: string
  isDark: boolean
}

export const useSettingsStore = defineStore('settings', () => {
  const apiKey = ref('')
  const baseUrl = ref('https://api.openai.com/v1')
  const userName = ref('')
  const isDarkValue = ref(isDark.value)

  function updateSettings(settings: Partial<SettingsState>) {
    if (settings.apiKey !== undefined)
      apiKey.value = settings.apiKey
    if (settings.baseUrl !== undefined)
      baseUrl.value = settings.baseUrl
    if (settings.userName !== undefined)
      userName.value = settings.userName
    if (settings.isDark !== undefined) {
      isDarkValue.value = settings.isDark
      isDark.value = settings.isDark
    }
  }

  function clearSettings() {
    apiKey.value = ''
    baseUrl.value = 'https://api.openai.com/v1'
    userName.value = ''
  }

  return {
    apiKey,
    baseUrl,
    userName,
    isDark: isDarkValue,
    updateSettings,
    clearSettings,
  }
}, {
  persist: {
    key: 'chat-settings',
    storage: localStorage,
  },
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore as any, import.meta.hot))
