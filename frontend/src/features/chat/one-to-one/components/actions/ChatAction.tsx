import { EllipsisVertical } from "lucide-react";
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
