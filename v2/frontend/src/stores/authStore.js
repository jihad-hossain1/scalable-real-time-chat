import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";
import { authService } from "@/services/authService";
import toast from "react-hot-toast";

const useAuthStore = create(
  persist(
    immer((set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastActivity: null,

      // Actions
      initialize: async () => {
        const state = get();

        if (state.token && state.refreshToken) {
          try {
            set((draft) => {
              draft.isLoading = true;
              draft.error = null;
            });

            // Validate existing token
            const isValid = await authService.validateToken(state.token);

            if (isValid) {
              // Token is valid, get user profile
              const userProfile = await authService.getProfile();

              set((draft) => {
                draft.user = userProfile;
                draft.isAuthenticated = true;
                draft.lastActivity = new Date().toISOString();
                draft.isLoading = false;
              });

              console.log("✅ Token validated, user authenticated");
            } else {
              // Token invalid, try to refresh
              console.log("🔄 Token invalid, attempting refresh...");
              await get().refreshTokens();
            }
          } catch (error) {
            console.error("❌ Token validation failed:", error);
            get().logout();
          }
        } else {
          set((draft) => {
            draft.isLoading = false;
          });
        }
      },

      login: async (credentials) => {
        try {
          set((draft) => {
            draft.isLoading = true;
            draft.error = null;
          });

          const response = await authService.login(credentials);
          console.log("🚀 ~ login: ~ response:", response);

          set((draft) => {
            draft.user = response?.user;
            draft.token = response?.data?.token;
            draft.refreshToken = response?.data?.refreshToken;
            draft.isAuthenticated = true;
            draft.lastActivity = new Date().toISOString();
            draft.isLoading = false;
          });

          // Set token in auth service
          authService.setToken(response?.data?.token);
          authService.setAuthUser(response?.user);

          toast.success(`Welcome back, ${response.user.username}!`);
          console.log("✅ Login successful");

          return response;
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || error.message || "Login failed";

          set((draft) => {
            draft.error = errorMessage;
            draft.isLoading = false;
          });

          toast.error(errorMessage);
          console.error("❌ Login failed:", error);
          throw error;
        }
      },

      register: async (userData) => {
        try {
          set((draft) => {
            draft.isLoading = true;
            draft.error = null;
          });

          const response = await authService.register(userData);
          console.log("🚀 ~ register: ~ response:", response);

          set((draft) => {
            draft.user = response.user;
            draft.token = response.token;
            draft.refreshToken = response.refreshToken;
            draft.isAuthenticated = true;
            draft.lastActivity = new Date().toISOString();
            draft.isLoading = false;
          });

          // Set token in auth service
          authService.setToken(response.token);

          toast.success(`Welcome to ChatApp, ${response.user.username}!`);
          console.log("✅ Registration successful");

          return response;
        } catch (error) {
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "Registration failed";

          set((draft) => {
            draft.error = errorMessage;
            draft.isLoading = false;
          });

          toast.error(errorMessage);
          console.error("❌ Registration failed:", error);
          throw error;
        }
      },

      logout: async (showMessage = true) => {
        try {
          const state = get();

          if (state.token) {
            await authService.logout();
          }
        } catch (error) {
          console.error("❌ Logout request failed:", error);
          // Continue with local logout even if server request fails
        }

        // Clear auth service token
        authService.clearTokens();

        // Clear state
        set((draft) => {
          draft.user = null;
          draft.token = null;
          draft.refreshToken = null;
          draft.isAuthenticated = false;
          draft.isLoading = false;
          draft.error = null;
          draft.lastActivity = null;
        });

        if (showMessage) {
          toast.success("Logged out successfully");
        }

        console.log("✅ Logout successful");
      },

      refreshTokens: async () => {
        try {
          const state = get();

          if (!state.refreshToken) {
            throw new Error("No refresh token available");
          }

          const response = await authService.refreshToken(state.refreshToken);

          set((draft) => {
            draft.token = response.token;
            draft.refreshToken = response.refreshToken;
            draft.lastActivity = new Date().toISOString();
          });

          // Set new token in auth service
          authService.setToken(response?.token);

          console.log("✅ Tokens refreshed successfully");
          return response;
        } catch (error) {
          console.error("❌ Token refresh failed:", error);
          get().logout(false);
          throw error;
        }
      },

      updateProfile: async (profileData) => {
        try {
          set((draft) => {
            draft.isLoading = true;
            draft.error = null;
          });

          const updatedUser = await authService.updateProfile(profileData);

          set((draft) => {
            draft.user = { ...draft.user, ...updatedUser };
            draft.lastActivity = new Date().toISOString();
            draft.isLoading = false;
          });

          toast.success("Profile updated successfully");
          console.log("✅ Profile updated");

          return updatedUser;
        } catch (error) {
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "Profile update failed";

          set((draft) => {
            draft.error = errorMessage;
            draft.isLoading = false;
          });

          toast.error(errorMessage);
          console.error("❌ Profile update failed:", error);
          throw error;
        }
      },

      changePassword: async (passwordData) => {
        try {
          set((draft) => {
            draft.isLoading = true;
            draft.error = null;
          });

          await authService.changePassword(passwordData);

          set((draft) => {
            draft.lastActivity = new Date().toISOString();
            draft.isLoading = false;
          });

          toast.success("Password changed successfully");
          console.log("✅ Password changed");
        } catch (error) {
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "Password change failed";

          set((draft) => {
            draft.error = errorMessage;
            draft.isLoading = false;
          });

          toast.error(errorMessage);
          console.error("❌ Password change failed:", error);
          throw error;
        }
      },

      forgotPassword: async (email) => {
        try {
          set((draft) => {
            draft.isLoading = true;
            draft.error = null;
          });

          await authService.forgotPassword(email);

          set((draft) => {
            draft.isLoading = false;
          });

          toast.success("Password reset instructions sent to your email");
          console.log("✅ Password reset email sent");
        } catch (error) {
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "Failed to send reset email";

          set((draft) => {
            draft.error = errorMessage;
            draft.isLoading = false;
          });

          toast.error(errorMessage);
          console.error("❌ Password reset failed:", error);
          throw error;
        }
      },

      resetPassword: async (token, newPassword) => {
        try {
          set((draft) => {
            draft.isLoading = true;
            draft.error = null;
          });

          await authService.resetPassword(token, newPassword);

          set((draft) => {
            draft.isLoading = false;
          });

          toast.success(
            "Password reset successfully. Please log in with your new password."
          );
          console.log("✅ Password reset successful");
        } catch (error) {
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "Password reset failed";

          set((draft) => {
            draft.error = errorMessage;
            draft.isLoading = false;
          });

          toast.error(errorMessage);
          console.error("❌ Password reset failed:", error);
          throw error;
        }
      },

      updateLastActivity: () => {
        set((draft) => {
          draft.lastActivity = new Date().toISOString();
        });
      },

      clearError: () => {
        set((draft) => {
          draft.error = null;
        });
      },

      // Getters
      getUser: () => get().user,
      getToken: () => get().token,
      isTokenExpired: () => {
        const state = get();
        if (!state.token) return true;

        try {
          const payload = JSON.parse(atob(state.token.split(".")[1]));
          return payload.exp * 1000 < Date.now();
        } catch {
          return true;
        }
      },

      // Auto-refresh token before expiration
      scheduleTokenRefresh: () => {
        const state = get();
        if (!state.token || !state.refreshToken) return;

        try {
          const payload = JSON.parse(atob(state.token.split(".")[1]));
          const expirationTime = payload.exp * 1000;
          const currentTime = Date.now();
          const timeUntilExpiration = expirationTime - currentTime;

          // Refresh token 5 minutes before expiration
          const refreshTime = Math.max(timeUntilExpiration - 5 * 60 * 1000, 0);

          if (refreshTime > 0) {
            setTimeout(() => {
              if (get().isAuthenticated) {
                get()
                  .refreshTokens()
                  .catch(() => {
                    // If refresh fails, logout user
                    get().logout(false);
                  });
              }
            }, refreshTime);

            console.log(
              `🔄 Token refresh scheduled in ${Math.round(
                refreshTime / 1000 / 60
              )} minutes`
            );
          }
        } catch (error) {
          console.error("❌ Failed to schedule token refresh:", error);
        }
      },
    })),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          // Set token in auth service after rehydration
          authService.setToken(state.token);

          // Schedule token refresh
          state.scheduleTokenRefresh();
        }
      },
    }
  )
);

// Auto-refresh token when store is created
if (typeof window !== "undefined") {
  const store = useAuthStore.getState();
  if (store.isAuthenticated && store.token) {
    store.scheduleTokenRefresh();
  }
}

export { useAuthStore };
