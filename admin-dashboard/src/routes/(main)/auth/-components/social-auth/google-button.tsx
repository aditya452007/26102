import { cn } from "cn";
import { siGoogle } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function GoogleButton({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="secondary"
      className={cn(className)}
      onClick={(event) => {
        if (onClick) {
          onClick(event);
          return;
        }
        toast.add({
          title: "Google sign-in unavailable in the prototype",
          description: "Use the officer email login to continue.",
        });
      }}
      {...props}
    >
      <SimpleIcon icon={siGoogle} className="size-4" />
      Continue with Google
    </Button>
  );
}
