"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

interface MemberImageViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  memberName: string;
}

export default function MemberImageViewModal({
  isOpen,
  onClose,
  imageSrc,
  memberName,
}: MemberImageViewModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClose = () => {
    setIsExpanded(false);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <>
      {/* Medium modal */}
      <Dialog open={isOpen && !isExpanded} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-3xl border-0 bg-orange-500 p-0 shadow-2xl"
        >
          <div className="relative w-full overflow-hidden rounded-2xl bg-orange-500">
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-xl font-bold text-white">{memberName}</h2>
              <button
                onClick={handleClose}
                className="rounded-full p-2 transition-colors hover:bg-white/15"
                title="Close"
              >
                <X size={28} className="text-white" strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex items-center justify-center bg-orange-600 px-6 pb-6">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="relative block h-56 w-full max-w-4xl cursor-zoom-in overflow-hidden rounded-lg shadow-lg sm:h-96"
                title="Expand image"
              >
                <Image
                  src={imageSrc}
                  alt={memberName}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 860px"
                  className="object-contain"
                />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen overlay */}
      {isOpen && isExpanded && (
        <div className="fixed inset-0 z-9999 flex flex-col bg-black">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="text-xl font-bold text-white">{memberName}</h2>
            <button
              onClick={handleClose}
              className="rounded-full p-2 transition-colors hover:bg-white/15"
              title="Close"
            >
              <X size={28} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="relative flex-1 w-full cursor-zoom-out"
            title="Shrink image"
          >
            <Image
              src={imageSrc}
              alt={memberName}
              fill
              unoptimized
              sizes="100vw"
              className="object-contain"
            />
          </button>
        </div>
      )}
    </>
  );
}
