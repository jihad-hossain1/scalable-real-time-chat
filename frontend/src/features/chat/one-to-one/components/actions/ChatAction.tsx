import { EllipsisVertical } from "lucide-react";
import { useChatContext } from "../../hooks/useChatContext";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../../redux/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../../components/ui/DropDown";
import { Drawer } from "../../../../../components/ui/Drawer";
import React from "react";
import { Profile } from "./Profile";

export const ChatAction = () => {
  const { selectedUser } = useChatContext();
  const { id: userId } = useSelector((state: RootState) => state.auth);
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      <DropdownMenu position="right">
        <DropdownMenuTrigger>
          <EllipsisVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setIsOpen(!isOpen)}>
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => alert("Delete clicked")}>
            Block
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => alert("Share clicked")}>
            Share
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Drawer size="xl" isOpen={isOpen} onClose={() => setIsOpen(!isOpen)}>
        <Profile />
      </Drawer>
    </>
  );
};
