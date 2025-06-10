import React from "react";
import { Phone, Video } from "lucide-react";
import { useChatContext } from "../../hooks/useChatContext";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../../redux/store";

export const CallAction = () => {
  const { selectedUser } = useChatContext();
  const { id: userId } = useSelector((state: RootState) => state.auth);

  return (
    <div className="flex gap-5 items-center">
      <button>
        <Phone className="text-blue-500" />
      </button>
      <button>
        <Video className="text-green-500" />
      </button>
    </div>
  );
};
