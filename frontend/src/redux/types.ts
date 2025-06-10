import type { TUser } from "../features/chat/one-to-one/types";

export type LoginInterface = Partial<TUser> & {
  authToken: string;
};

export const loginInitialState: LoginInterface = {
  name: "",
  email: "",
  id: 0,
  authToken: "",
};

export const LOCAL_STORAGE_KEY = {
  AUTH: "auth",
} as const;
