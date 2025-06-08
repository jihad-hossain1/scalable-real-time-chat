export type TMessage = {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestemp: string;
};

export type TUser = {
  id: number;
  name: string;
  email: string;
};

export type State = {
  messages: TMessage[];
  onlineUsers: TUser[];
  filter: {
    query?: string;
  };

  // userId?: number | string;
  receiverId?: number | null;
  isChatUserSelect?: boolean;
};

export type SEtStateAction = {
  type: "SET_STATE";
  payload: State;
};

export type UpdateState = {
  type: "UPDATE_STATE";
  payload: Partial<State>;
};

export type ResetAction = {
  type: "RESET";
};

export type Action = SEtStateAction | UpdateState | ResetAction;
