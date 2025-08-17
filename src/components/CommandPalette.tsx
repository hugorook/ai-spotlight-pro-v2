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
          <CommandItem onSelect={() => run(() => navigate('/geo'))}>Go to AI Health Check</CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/dashboard'))}>Go to Results Dashboard</CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/content'))}>Go to Company Profile</CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/settings'))}>Go to Settings</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => navigate('/geo'))}>Run Health Check</CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/content'))}>Edit Company Profile</CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/dashboard'))}>View Results</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

