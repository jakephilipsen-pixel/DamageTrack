import { Dialog, DialogContent } from '../ui/dialog';
import { Sidebar } from './Sidebar';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="p-0 max-w-xs w-full h-full fixed left-0 top-0 translate-x-0 translate-y-0 rounded-none border-r border-l-0 border-t-0 border-b-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left">
        <Sidebar onNavClick={onClose} />
      </DialogContent>
    </Dialog>
  );
}
