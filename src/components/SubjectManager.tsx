import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Subject } from '@/types';
import { trpc } from '@/providers/trpc';

export function SubjectManager({ onCreated }: { onCreated: (subject: Subject) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = trpc.atlas.createSubject.useMutation();

  const submit = async () => {
    if (!name.trim() || create.isPending) return;
    setError(null);
    try {
      const { subjectId } = await create.mutateAsync({ name: name.trim() });
      onCreated({ id: subjectId, name: name.trim(), description: '', source: 'llm' });
      setName('');
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learn something new</CardTitle>
        <CardDescription>
          Name any subject — the AI designs a prerequisite-linked curriculum, then teaches it mastery-based.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="e.g. Jazz piano, Organic chemistry, Portuguese…" disabled={create.isPending} />
          <Button onClick={submit} disabled={create.isPending || !name.trim()}>
            {create.isPending ? 'Designing…' : 'Create subject'}
          </Button>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error.includes('AiUnavailable') ? 'AI quota exhausted — the site owner needs to recharge on kimi.com.' : error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
