import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/providers/trpc';
import { schedule } from '@/lib/srs';

export function ReviewDeck({ subjectId }: { subjectId: string }) {
  const deck = trpc.atlas.reviewDeck.useQuery({ subjectId });
  const save = trpc.atlas.saveReviewItem.useMutation();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  const due = deck.data ?? [];
  if (deck.isLoading) return <Card><CardContent className="py-8"><Progress value={60} className="animate-pulse" /></CardContent></Card>;

  if (done || due.length === 0)
    return (
      <Card>
        <CardHeader>
          <CardTitle>{due.length === 0 ? 'Review deck clear' : 'Review complete'}</CardTitle>
          <CardDescription>
            {due.length === 0 ? 'Nothing due. New items appear as you chat and miss questions.' : 'Come back when the next items are due.'}
          </CardDescription>
        </CardHeader>
        <CardContent>{due.length === 0 ? null : <Button onClick={() => { setIdx(0); setDone(false); }}>Review again</Button>}</CardContent>
      </Card>
    );

  const item = due[idx];
  const grade = async (quality: 0 | 3 | 5) => {
    const base = {
      id: item.id, subjectId: item.subjectId, front: item.front, back: item.back,
      note: item.note ?? undefined, ease: item.ease, intervalDays: item.intervalDays,
      repetitions: item.repetitions, dueAt: new Date(item.dueAt).getTime(),
      createdAt: new Date(item.createdAt).getTime(),
    };
    const scheduled = schedule(base, quality);
    const next = { ...scheduled, dueAt: new Date(scheduled.dueAt) };
    await save.mutateAsync({
      id: next.id, subjectId: next.subjectId, front: next.front, back: next.back, note: next.note ?? undefined,
      ease: next.ease, intervalDays: next.intervalDays, repetitions: next.repetitions, dueAt: new Date(next.dueAt),
    });
    setFlipped(false);
    if (idx + 1 >= due.length) setDone(true);
    else setIdx(idx + 1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription>Card {idx + 1} of {due.length}</CardDescription>
          {item.intervalDays > 0 && <Badge variant="secondary">interval {item.intervalDays}d · ease {item.ease.toFixed(1)}</Badge>}
        </div>
        <Progress value={((idx + (flipped ? 1 : 0)) / due.length) * 100} />
      </CardHeader>
      <CardContent className="space-y-4">
        <button onClick={() => setFlipped((f) => !f)}
          className="flex min-h-40 w-full flex-col items-center justify-center rounded-lg border bg-muted/40 p-6 text-center">
          {!flipped ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Prompt</p>
              <p className="mt-2 text-lg font-medium">{item.front}</p>
              <p className="mt-4 text-xs text-muted-foreground">tap to reveal</p>
            </div>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Answer</p>
              <p className="mt-2 text-lg font-medium">{item.back}</p>
              {item.note && <p className="mt-3 text-sm text-muted-foreground">{item.note}</p>}
            </div>
          )}
        </button>
        {flipped && (
          <div className="grid grid-cols-3 gap-2">
            <Button variant="destructive" onClick={() => grade(0)}>Forgot</Button>
            <Button variant="outline" onClick={() => grade(3)}>Hard</Button>
            <Button onClick={() => grade(5)}>Easy</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
