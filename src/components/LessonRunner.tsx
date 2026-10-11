import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MasteryProfile, Question, Subject, Topic } from '@/types';
import { trpc } from '@/providers/trpc';

type Phase = 'loading' | 'asking' | 'summary';

interface GapAlert {
  topicId: string;
  topicLabel: string;
  prereqId: string;
  prereqLabel: string;
}

function detectGap(q: { topicId: string }, topics: Topic[], profiles: MasteryProfile[]): GapAlert | null {
  const topic = topics.find((t) => t.id === q.topicId);
  if (!topic) return null;
  const byId = new Map(profiles.map((p) => [p.topicId, p]));
  for (const pre of topic.prereqIds) {
    const p = byId.get(pre);
    if (p && !p.mastered) {
      const preTopic = topics.find((t) => t.id === pre)!;
      return { topicId: topic.id, topicLabel: topic.label, prereqId: pre, prereqLabel: preTopic.label };
    }
  }
  return null;
}

export function LessonRunner({
  subject, topics, profiles, count, focusTopicId, onDone,
}: {
  subject: Subject;
  topics: Topic[];
  profiles: MasteryProfile[];
  count: number;
  focusTopicId?: string;
  onDone: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [freeResult, setFreeResult] = useState<'correct' | 'incorrect' | null>(null);
  const [answers, setAnswers] = useState<(boolean | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gap, setGap] = useState<GapAlert | null>(null);
  const [currentFocus, setCurrentFocus] = useState<string | undefined>(focusTopicId);
  const startRef = useRef(Date.now());

  const genLesson = trpc.atlas.generateLesson.useMutation();
  const logAttempt = trpc.atlas.logAttempt.useMutation();
  const saveReview = trpc.atlas.saveReviewItem.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // pick target topic
        let target = currentFocus ? topics.find((t) => t.id === currentFocus) : undefined;
        if (!target) {
          const queue = profiles
            .filter((p) => p.unlocked && !p.mastered)
            .sort((a, b) => {
              const ta = topics.find((t) => t.id === a.topicId)!;
              const tb = topics.find((t) => t.id === b.topicId)!;
              if (ta.level !== tb.level) return ta.level < tb.level ? -1 : 1;
              if ((a.attempts === 0) !== (b.attempts === 0)) return a.attempts === 0 ? -1 : 1;
              return a.mastery - b.mastery;
            });
          target = topics.find((t) => t.id === queue[0]?.topicId) ?? topics[0];
        }
        if (!target) throw new Error('No topics available');
        const prof = profiles.find((p) => p.topicId === target.id);

        let qs: Question[] = [];
        try {
          const rows = await genLesson.mutateAsync({
            subjectName: subject.name,
            topicId: target.id,
            topicLabel: target.label,
            level: target.level,
            attempts: prof?.attempts ?? 0,
            successRate: prof?.successRate ?? 0,
            mastery: prof?.mastery ?? 0,
            count,
          });
          if (rows?.length) {
            qs = rows.map((r) => ({
              id: r.id, subjectId: r.subjectId, topicId: r.topicId, kind: r.kind,
              prompt: r.prompt, choices: r.choices, answer: r.answer, answerIndex: r.answerIndex,
              explanation: r.explanation, breakdown: r.breakdown ?? undefined, source: r.source,
              createdAt: new Date(r.createdAt).getTime(),
            }));
          }
        } catch { /* fall through to bank */ }

        if (qs.length < count) {
          const topicIds = [target.id, ...topics.map((t) => t.id)];
          const bank = await utils.client.atlas.questionsForTopics.query({ topicIds, count });
          const mapped = bank.map((r) => ({
            id: r.id, subjectId: r.subjectId, topicId: r.topicId, kind: r.kind,
            prompt: r.prompt, choices: r.choices, answer: r.answer, answerIndex: r.answerIndex,
            explanation: r.explanation, breakdown: r.breakdown ?? undefined, source: r.source,
            createdAt: new Date(r.createdAt).getTime(),
          }));
          const seen = new Set(qs.map((q) => q.id));
          for (const m of mapped) {
            if (qs.length >= count) break;
            if (!seen.has(m.id)) qs.push(m);
          }
        }

        if (cancelled) return;
        setQuestions(qs.slice(0, count));
        setAnswers(qs.map(() => null));
        setPhase('asking');
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, currentFocus]);

  const q = questions[idx];
  const isMC = q?.kind === 'multiple-choice';

  const record = async (correct: boolean) => {
    if (!q) return;
    await logAttempt.mutateAsync({
      questionId: q.id, topicId: q.topicId, subjectId: q.subjectId,
      correct, timeMs: Date.now() - startRef.current,
    });
    setAnswers((a) => { const n = [...a]; n[idx] = correct; return n; });
    if (!correct) {
      await saveReview.mutateAsync({
        id: `rv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        subjectId: q.subjectId,
        front: q.prompt, back: q.answer,
        note: q.explanation.slice(0, 120),
        ease: 2.5, intervalDays: 0, repetitions: 0, dueAt: new Date(),
      });
      const g = detectGap(q, topics, profiles);
      if (g) setGap(g);
    }
  };

  const gradeFree = async () => {
    if (freeResult || !typed.trim() || !q) return;
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.!¿?¡,]/g, '').trim();
    const ok = norm(typed) === norm(q.answer);
    setFreeResult(ok ? 'correct' : 'incorrect');
    await record(ok);
  };

  const choose = async (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    await record(i === q.answerIndex);
  };

  const next = () => {
    if (idx + 1 >= questions.length) setPhase('summary');
    else { setIdx(idx + 1); setPicked(null); setTyped(''); setFreeResult(null); startRef.current = Date.now(); }
  };

  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  if (phase === 'loading') return (
    <Card>
      <CardHeader>
        <CardTitle>Building your lesson…</CardTitle>
        <CardDescription>Reading the mastery map and calibrating difficulty.</CardDescription>
      </CardHeader>
      <CardContent><Progress value={60} className="animate-pulse" /></CardContent>
    </Card>
  );
  if (phase === 'summary') {
    const correct = answers.filter(Boolean).length;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lesson complete: {correct}/{answers.length}</CardTitle>
          <CardDescription>
            {correct / answers.length >= 0.9 ? 'Mastery demonstrated — this topic advances.'
              : correct / answers.length >= 0.8 ? 'In the sweet spot. One more round should secure mastery.'
              : 'Below the sweet spot. Missed items were added to your review deck; next lesson stays at this level.'}
          </CardDescription>
        </CardHeader>
        <CardContent><Button onClick={onDone}>Back to overview</Button></CardContent>
      </Card>
    );
  }
  if (!q) return null;
  const topic = topics.find((t) => t.id === q.topicId);

  return (
    <div className="relative">
      {gap && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/90 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border-2 border-amber-500 bg-card p-6 text-center shadow-lg">
            <p className="text-lg font-bold text-amber-600">Gap Detected</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You missed <span className="font-medium text-foreground">{gap.topicLabel}</span>, but its foundation —{' '}
              <span className="font-medium text-foreground">{gap.prereqLabel}</span> — isn't mastered yet.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => { setGap(null); setCurrentFocus(gap.prereqId); setIdx(0); setPicked(null); setAnswers([]); setPhase('loading'); }}>
                Rebuild: {gap.prereqLabel}
              </Button>
              <Button variant="outline" onClick={() => setGap(null)}>Continue anyway</Button>
            </div>
          </div>
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardDescription>Question {idx + 1} of {questions.length}</CardDescription>
            {topic && <div className="flex gap-2"><Badge variant="outline">{topic.label}</Badge>{topic.level && <Badge variant="secondary">{topic.level}</Badge>}</div>}
          </div>
          <Progress value={((idx + (picked !== null || freeResult ? 1 : 0)) / questions.length) * 100} />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base font-medium leading-relaxed">{q.prompt}</p>
          {isMC ? (
            <div className="space-y-2">
              {q.choices.map((c, i) => {
                let cls = 'justify-start text-left w-full';
                if (picked !== null) {
                  if (i === q.answerIndex) cls += ' bg-green-100 dark:bg-green-950 border-green-500';
                  else if (i === picked) cls += ' bg-red-100 dark:bg-red-950 border-red-500';
                }
                return (
                  <Button key={i} variant="outline" className={cls} onClick={() => choose(i)}>
                    <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>{c}
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input value={typed} disabled={freeResult !== null} onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && gradeFree()} placeholder="Type your answer…" />
                <Button onClick={gradeFree} disabled={freeResult !== null || !typed.trim()}>Check</Button>
              </div>
              {freeResult === 'incorrect' && <p className="text-sm">Correct answer: <span className="font-semibold">{q.answer}</span></p>}
              {freeResult && <Badge variant={freeResult === 'correct' ? 'default' : 'destructive'}>{freeResult === 'correct' ? 'Correct' : 'Missed — added to review deck'}</Badge>}
            </div>
          )}
          {(picked !== null || freeResult) && (
            <div className="space-y-3 rounded-md border p-4">
              <div>
                <p className="text-sm font-semibold">Explain my answer</p>
                <p className="text-sm text-muted-foreground">{q.explanation}</p>
              </div>
              {q.breakdown && <div className="rounded-md bg-muted p-3"><pre className="whitespace-pre-wrap text-sm text-muted-foreground">{q.breakdown}</pre></div>}
              <Button onClick={next}>{idx + 1 >= questions.length ? 'Finish lesson' : 'Next'}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
