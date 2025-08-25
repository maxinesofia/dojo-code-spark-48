import { Button } from '@/components/ui/button';
import { 
  SplitSquareHorizontal,
  SplitSquareVertical,
  X
} from 'lucide-react';
import { SplitMode } from './SplitEditor';
import { cn } from '@/lib/utils';

interface SplitControlsProps {
  paneCount: number;
  splitMode: SplitMode;
  onSplit: () => void;
  onToggleSplitMode: () => void;
  onMergePanes: () => void;
}

export function SplitControls({
  paneCount,
  splitMode,
  onSplit,
  onToggleSplitMode,
  onMergePanes
}: SplitControlsProps) {
  if (paneCount === 1) {
    return null; // Hide controls when there's only one pane
  }

  return (
    <div className="flex items-center justify-end gap-1 px-2 py-1 border-b bg-background/80 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleSplitMode}
        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        title={`Switch to ${splitMode === 'vertical' ? 'horizontal' : 'vertical'} split`}
      >
        {splitMode === 'vertical' ? (
          <SplitSquareVertical className="h-3 w-3" />
        ) : (
          <SplitSquareHorizontal className="h-3 w-3" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onMergePanes}
        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        title="Close split view"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}