import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useDespia } from '@/hooks/useDespia';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Contact {
  name: string;
  email?: string;
  phone?: string;
}

interface ContactImporterProps {
  onContactsSelected: (contacts: Contact[]) => void;
}

export function ContactImporter({ onContactsSelected }: ContactImporterProps) {
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { requestContactsPermission, readContacts, triggerHaptic } = useDespia();

  const handleImport = async () => {
    setLoading(true);
    triggerHaptic('light');

    try {
      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        toast.error('Contacts permission denied');
        triggerHaptic('error');
        setLoading(false);
        return;
      }

      const importedContacts = await readContacts();
      if (importedContacts.length > 0) {
        setContacts(importedContacts);
        setShowDialog(true);
        triggerHaptic('success');
      } else {
        toast.info('No contacts found');
        triggerHaptic('warning');
      }
    } catch (error) {
      toast.error('Failed to import contacts');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onContactsSelected(contacts);
    setShowDialog(false);
    toast.success(`Imported ${contacts.length} contacts`);
    triggerHaptic('success');
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleImport}
        disabled={loading}
      >
        <Users className="mr-2 h-4 w-4" />
        {loading ? 'Importing...' : 'Import from Contacts'}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>
              Found {contacts.length} contacts. Import them as clients?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {contacts.slice(0, 10).map((contact, i) => (
              <div key={i} className="p-2 border rounded text-sm">
                <p className="font-medium">{contact.name}</p>
                {contact.email && <p className="text-muted-foreground">{contact.email}</p>}
                {contact.phone && <p className="text-muted-foreground">{contact.phone}</p>}
              </div>
            ))}
            {contacts.length > 10 && (
              <p className="text-sm text-muted-foreground">
                And {contacts.length - 10} more...
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Import All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
