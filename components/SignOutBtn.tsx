"use client";

import { signOut } from "@/lib/auth/auth-client";
import { DropdownMenuItem } from "./ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const SignOutBtn = () => {
  const router = useRouter();

  return (
    <DropdownMenuItem
      onClick={async () => {
        const result = await signOut();
        if (result.data) {
          router.push("/sign-in");
        } else {
          toast.error("Error signing out");
        }
      }}
    >
      Log Out
    </DropdownMenuItem>
  );
};

export default SignOutBtn;
