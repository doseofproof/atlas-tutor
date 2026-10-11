import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Subject, Topic } from '@/types';
import { trpc } from '@/providers/trpc';

interface Turn { role: 'user' | 'tutor'; text: string }

export function TutorChat({
  subject, topics, learnerNote, suggestTopic,
}: {
  subject: Subject;
  topics: Topic[];
  learnerNote?: string | null;
  suggestTopic?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [itemsSaved, setItemsSaved] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topic = suggestTopic ? topics.find((t) => t.id === suggestTopic) : undefined;
  const chat = trpc.atlas.tutorChat.useMutation();
  const saveReview = trpc.atlas.saveReviewItem.useMutation();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || busy) return;
    setInput('');
    setBusy(true);
    const history = turns.map((t) => ({ role: t.role, text: t.text }));
    setTurns((t) => [...t, { role: 'user', text: msg }]);
    try {
      const r = await chat.mutateAsync({
        subjectName: subject.name,
        topicLabel: topic?.label,
        level: topic?.level,
        learnerNote: learnerNote ?? undefined,
        history, message: msg,
      });
      setTurns((t) => [...t, { role: 'tutor', text: r.reply }]);
      for (const it of r.reviewItems ?? []) {
        await saveReview.mutateAsync({
          id: `rv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          subjectId: subject.id,
          front: it.front, back: it.back, note: it.note,
          ease: 2.5, intervalDays: 0, repetitions: 0, dueAt: new Date(),
        });
      }
      if ((r.reviewItems ?? []).length > 0) setItemsSaved((n) => n + (r.reviewItems?.length ?? 0));
    } catch (e) {
      setTurns((t) => [...t, { role: 'tutor', text: `⚠️ Tutor unavailable: ${String(e).slice(0, 200)}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex h-[70vh] flex-col">
      <CardHeader>
        <CardTitle>Tutor conversation</CardTitle>
        <CardDescription>
          {topic ? `Anchored to: ${topic.label} (${topic.level}). ` : ''}
          Atlas corrects after you finish your thought, then logs what to memorize.
          {itemsSaved > 0 && ` · ${itemsSaved} item${itemsSaved === 1 ? '' : 's'} saved to review`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <ScrollArea className="min-h-0 flex-1 rounded-md border p-4">
          <div className="space-y-4">
            {turns.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Start with anything — introduce yourself, describe your day, or ask a grammar/statute question.
                {topic ? ` Try answering using this topic.` : ''}
              </p>
            )}
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${t.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {t.role === 'tutor' && <Badge variant="outline" className="mb-1 mr-2">Atlas</Badge>}
                  {t.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={busy ? 'Atlas is thinking…' : 'Write your answer / question…'} disabled={busy} />
          <Button onClick={send} disabled={busy || !input.trim()}>Send</Button>
        </div>
      </CardContent>
    </Card>
  );
}
