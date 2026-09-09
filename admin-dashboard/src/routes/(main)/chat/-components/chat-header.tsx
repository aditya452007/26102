import { MessageSquarePlus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

import { COPILOT_ID } from "./data";
import { useChat } from "./use-chat";

interface ChatHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export function ChatHeader({ query, onQueryChange }: ChatHeaderProps) {
  const [, setChat] = useChat();

  return (
    <header className="sticky top-0 z-50 flex h-(--header-height) w-full items-center border-b bg-background">
      <div className="flex h-full w-full items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <h1 className="text-nowrap font-medium text-base">NIRIKSHAN Copilot</h1>
          <InputGroup className="h-7 w-full max-w-sm">
            <InputGroupInput
              className="h-7"
              placeholder="Search threads..."
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="New question"
            onClick={() => setChat({ selected: COPILOT_ID })}
          >
            <MessageSquarePlus />
          </Button>
        </div>
      </div>
    </header>
  );
}
