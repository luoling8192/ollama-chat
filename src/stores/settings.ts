import { defineStore } from 'pinia'
import { isDark } from '~/composables/dark'

interface SettingsState {
  apiKey: string
  baseUrl: string
  userName: string
  isDark: boolean
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    userName: '',
    isDark: isDark.value,
  }),

  persist: {
    key: 'chat-settings',
    storage: localStorage,
    paths: ['apiKey', 'baseUrl', 'userName', 'isDark'],
  },

  actions: {
    updateSettings(settings: Partial<SettingsState>) {
      Object.assign(this, settings)
      if (settings.isDark !== undefined)
        isDark.value = settings.isDark
    },

    clearSettings() {
      this.apiKey = ''
      this.baseUrl = 'https://api.openai.com/v1'
      this.userName = ''
    },
  },
})
