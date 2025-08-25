import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Split, 
  Combine, 
  RotateCcw, 
  Link, 
  Unlink,
  SplitSquareHorizontal,
  SplitSquareVertical,
  PanelTopClose
} from 'lucide-react';
import { SplitMode } from './SplitEditor';
import { cn } from '@/lib/utils';

interface SplitControlsProps {
  paneCount: number;
  splitMode: SplitMode;
  syncScrolling: boolean;
  onSplit: () => void;
  onToggleSplitMode: () => void;
  onMergePanes: () => void;
  onToggleSyncScrolling: () => void;
  focusedPaneId: string;
  totalPanes: number;
}

export function SplitControls({
  paneCount,
  splitMode,
  syncScrolling,
  onSplit,
  onToggleSplitMode,
  onMergePanes,
  onToggleSyncScrolling,
  focusedPaneId,
  totalPanes
}: SplitControlsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/5">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSplit}
                className="h-7 px-2"
              >
                <Split className="h-3 w-3 mr-1" />
                Split
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Split editor (Ctrl+\)</p>
            </TooltipContent>
          </Tooltip>

          {paneCount > 1 && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleSplitMode}
                    className="h-7 px-2"
                  >
                    {splitMode === 'vertical' ? (
                      <SplitSquareVertical className="h-3 w-3 mr-1" />
                    ) : (
                      <SplitSquareHorizontal className="h-3 w-3 mr-1" />
                    )}
                    {splitMode === 'vertical' ? 'Horizontal' : 'Vertical'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle split orientation</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMergePanes}
                    className="h-7 px-2"
                  >
                    <PanelTopClose className="h-3 w-3 mr-1" />
                    Merge
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Merge all panes</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        <div className="flex items-center gap-1">
          {paneCount > 1 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={syncScrolling ? "secondary" : "ghost"}
                  size="sm"
                  onClick={onToggleSyncScrolling}
                  className="h-7 px-2"
                >
                  {syncScrolling ? (
                    <Link className="h-3 w-3 mr-1" />
                  ) : (
                    <Unlink className="h-3 w-3 mr-1" />
                  )}
                  Sync Scroll
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle synchronized scrolling</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {paneCount > 1 && (
            <span>
              {paneCount} pane{paneCount > 1 ? 's' : ''} • 
              Focused: {focusedPaneId === 'main' ? '1' : focusedPaneId.split('-')[1]}
            </span>
          )}
          
          <span className="text-[10px] px-2 py-1 bg-muted rounded">
            Ctrl+\ Split • Ctrl+W Close • Ctrl+1-9 Focus
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}