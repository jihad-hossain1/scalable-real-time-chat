import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useThemeStore = create(
  persist(
    (set, get) => ({
      // State
      theme: 'light', // 'light' | 'dark' | 'system'
      isDark: false,
      
      // Actions
      setTheme: (theme) => {
        set({ theme })
        get().applyTheme(theme)
      },
      
      toggleTheme: () => {
        const currentTheme = get().theme
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },
      
      applyTheme: (theme) => {
        const root = document.documentElement
        
        if (theme === 'system') {
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          const isDark = systemPrefersDark
          
          if (isDark) {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
          
          set({ isDark })
        } else {
          const isDark = theme === 'dark'
          
          if (isDark) {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
          
          set({ isDark })
        }
      },
      
      initializeTheme: () => {
        const { theme } = get()
        get().applyTheme(theme)
        
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = () => {
          if (get().theme === 'system') {
            get().applyTheme('system')
          }
        }
        
        mediaQuery.addEventListener('change', handleChange)
        
        // Return cleanup function
        return () => {
          mediaQuery.removeEventListener('change', handleChange)
        }
      }
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme })
    }
  )
)

export { useThemeStore }