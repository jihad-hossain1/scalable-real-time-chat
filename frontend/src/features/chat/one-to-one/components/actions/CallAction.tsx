import { Phone, Video } from "lucide-react";

export const CallAction = () => {
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
