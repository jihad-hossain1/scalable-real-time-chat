import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  LOCAL_STORAGE_KEY,
  loginInitialState,
  type LoginInterface,
} from "../types";

// Define action types for better type safety
type LoggedUserPayload = LoginInterface;

// Separate localStorage operations into a utility function
const persistAuthState = (state: LoginInterface) => {
  localStorage.setItem(LOCAL_STORAGE_KEY.AUTH, JSON.stringify(state));
};

const clearAuthState = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY.AUTH);
};

const authSlice = createSlice({
  name: "auth", // More descriptive name than "login"
  initialState: loginInitialState,
  reducers: {
    loggedUser: (state, action: PayloadAction<LoggedUserPayload>) => {
      // Use object spread for cleaner state updates
      Object.assign(state, action.payload);
      // Persist state after update
      persistAuthState(state);
    },

    logoutUser: (state) => {
      // Reset all fields to initial values
      Object.assign(state, {
        ...loginInitialState,
      });
      // Clear persisted state
      clearAuthState();
    },
  },
});

export const { loggedUser, logoutUser } = authSlice.actions;

// Export the reducer as a named export for better clarity
export const authReducer = authSlice.reducer;
export default authReducer;
