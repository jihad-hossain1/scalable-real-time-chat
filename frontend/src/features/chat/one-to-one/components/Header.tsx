import { MessageCircle } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../redux/store";

export const Header = () => {
  const { name } = useSelector((state: RootState) => state.auth);
  return (
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">ChatApp</h1>
          <p className="text-sm text-gray-500">Professional Messaging</p>
          <p className="">
            <span className="bg-blue-100 text-xs  px-3 py-1 rounded text-nowrap">
              {name}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
