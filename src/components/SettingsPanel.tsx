import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/providers/trpc';

export function SettingsPanel({ subjectId, learnerNote }: { subjectId: string; learnerNote?: string | null }) {
  const [note, setNote] = useState(learnerNote ?? '');
  const [saved, setSaved] = useState(false);
  const save = trpc.atlas.saveLearnerNote.useMutation();

  useEffect(() => { setNote(learnerNote ?? ''); }, [learnerNote]);

  const submit = async () => {
    await save.mutateAsync({ subjectId, note });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
          <CardDescription>
            The tutor reads this before every session — background, goals, how you like to learn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
            placeholder="E.g. Philosophy & legal studies background; explain grammar as rules and systems." />
          <Button onClick={submit} disabled={save.isPending}>Save</Button>
          {saved && <Alert><AlertDescription>Saved.</AlertDescription></Alert>}
        </CardContent>
      </Card>
    </div>
  );
}
