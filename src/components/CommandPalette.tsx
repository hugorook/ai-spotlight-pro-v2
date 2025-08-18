import { useEffect, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { Activity, BarChart3, MessageSquare, User, Settings, Play, Edit3, Eye } from "lucide-react";

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
      <CommandInput placeholder="Search commands and navigate..." />
      <CommandList>
        <CommandEmpty>
          <div className="py-8 text-center">
            <div className="text-gray-600 mb-2">No results found</div>
            <div className="text-xs text-gray-500">Try searching for pages or actions</div>
          </div>
        </CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => run(() => navigate('/geo'))}>
            <Activity className="w-4 h-4 mr-2" />
            AI Health Check
            <span className="ml-auto text-xs text-gray-500">Test your visibility</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/dashboard'))}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Results Dashboard
            <span className="ml-auto text-xs text-gray-500">View metrics</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/prompts'))}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Test Prompts
            <span className="ml-auto text-xs text-gray-500">Manage queries</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/content'))}>
            <User className="w-4 h-4 mr-2" />
            Company Profile
            <span className="ml-auto text-xs text-gray-500">Edit info</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/settings'))}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
            <span className="ml-auto text-xs text-gray-500">Preferences</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => run(() => navigate('/geo'))}>
            <Play className="w-4 h-4 mr-2" />
            Run Health Check
            <span className="ml-auto text-xs text-gray-500">Start AI test</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/prompts'))}>
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Test Prompts
            <span className="ml-auto text-xs text-gray-500">Customize queries</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/dashboard'))}>
            <Eye className="w-4 h-4 mr-2" />
            View Latest Results
            <span className="ml-auto text-xs text-gray-500">Check performance</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

