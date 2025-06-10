import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/authSlice";
import { LOCAL_STORAGE_KEY } from "./types";

// Rehydrate from localStorage
const rehydratedState = (): any => {
  if (typeof window !== "undefined") {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY.AUTH);
    return savedState ? JSON.parse(savedState) : undefined;
  }
  return undefined;
};

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: rehydratedState(),
    },
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
