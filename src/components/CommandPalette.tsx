import { useEffect, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useNavigate } from "react-router-dom";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => run(() => navigate('/dashboard'))}>Go to Dashboard</CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/geo'))}>Go to My GEO</CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/competitors'))}>Go to Competitors</CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/content'))}>Go to Content Assistant</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => navigate('/geo?run=health'))}>Run Health Check</CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/competitors?add=1'))}>Add Competitor</CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/content?new=brief'))}>Generate Content Brief</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

