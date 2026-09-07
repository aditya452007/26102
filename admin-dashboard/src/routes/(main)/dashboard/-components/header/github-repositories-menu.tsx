import { siGithub } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";

export function GitHubRepositoriesMenu() {
  return (
    <Button
      size="icon"
      aria-label="Open project repository on GitHub"
      nativeButton={false}
      render={<a href="https://github.com/aditya452007/26102.git" target="_blank" rel="noreferrer" />}
    >
      <SimpleIcon icon={siGithub} className="fill-primary-foreground" />
    </Button>
  );
}
