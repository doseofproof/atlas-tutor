import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MasteryProfile, Question, Topic } from '@/types';
import { trpc } from '@/providers/trpc';
import { ARK_RE_BLUEPRINT_WEIGHT, EXAM_ADMIN } from '@/data/arkansasRe';

type Phase = 'ready' | 'running' | 'report';

interface DomainResult {
  topicId: string;
  label: string;
  weight: number;
  correct: number;
  asked: number;
  mastery: number;
}

/** Domain weighting → number of questions in a 10-item diagnostic module. */
function weightToCount(weight: number, total: number, n: number): number {
  return Math.max(1, Math.round((weight / total) * n));
}

function buildPlan(topics: Topic[], n: number): Array<{ topicId: string; count: number }> {
  const entries = topics
    .map((t) => ({ topicId: t.id, weight: ARK_RE_BLUEPRINT_WEIGHT[t.id] ?? 1 }))
    .filter((e) => e.weight > 0);
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  const plan = entries.map((e) => ({ topicId: e.topicId, count: weightToCount(e.weight, totalWeight, n) }));
  // normalize to exactly n
  let sum = plan.reduce((s, p) => s + p.count, 0);
  let i = 0;
  while (sum !== n) {
    if (sum > n && plan[i].count > 1) {
      plan[i].count--;
      sum--;
    } else if (sum < n) {
      plan[i].count++;
      sum++;
    }
    i = (i + 1) % plan.length;
  }
  return plan;
}

export function ExamSim({
  topics,
  profiles,
  onDone,
}: {
  topics: Topic[];
  profiles: MasteryProfile[];
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<Map<string, { correct: number; asked: number }>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const logAttempt = trpc.atlas.logAttempt.useMutation();

  const start = async () => {
    try {
      const plan = buildPlan(topics, 10);
      const all: Question[] = [];
      for (const p of plan) {
        const bank = await utils.client.atlas.questionsForTopics.query({ topicIds: [p.topicId], count: p.count });
        all.push(...bank.map((r) => ({
          id: r.id, subjectId: r.subjectId, topicId: r.topicId, kind: r.kind,
          prompt: r.prompt, choices: r.choices, answer: r.answer, answerIndex: r.answerIndex,
          explanation: r.explanation, breakdown: r.breakdown ?? undefined, source: r.source,
          createdAt: new Date(r.createdAt).getTime(),
        })));
      }
      setQuestions(all.slice(0, 10));
      setPhase('running');
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    if (idx >= questions.length && questions.length > 0 && phase === 'running') {
      setPhase('report');
    }
  }, [idx, questions.length, phase]);

  const q = questions[idx];
  const topic = q ? topics.find((t) => t.id === q.topicId) : undefined;

  const choose = async (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    const ok = i === q.answerIndex;
    await logAttempt.mutateAsync({
      questionId: q.id, topicId: q.topicId, subjectId: q.subjectId, correct: ok, timeMs: 0,
    });
    setResults((r) => {
      const cur = r.get(q.topicId) ?? { correct: 0, asked: 0 };
      const next = new Map(r);
      next.set(q.topicId, { correct: cur.correct + (ok ? 1 : 0), asked: cur.asked + 1 });
      return next;
    });
    setTimeout(() => {
      setPicked(null);
      setIdx((v) => v + 1);
    }, 1600);
  };

  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  if (phase === 'ready')
    return (
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Exam Simulation</CardTitle>
          <CardDescription>
            A 10-question module weighted to the exact Pearson VUE blueprint — National (80) and State (30)
            in proportion, so weaknesses surface where they actually cost points. Includes unscored-style
            pre-test awareness: on the real exam, 15 items don't count but look identical.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Real exam: {EXAM_ADMIN.scoredNational}+{EXAM_ADMIN.scoredState} scored · pass{' '}
            {EXAM_ADMIN.passScaled} scaled on each section · {EXAM_ADMIN.totalTimeMin} min · partial pass
            valid {EXAM_ADMIN.partialPassMonths} months · file within {EXAM_ADMIN.filingWindowDays} days.
          </div>
          <Button onClick={start}>Start 10-question diagnostic</Button>
        </CardContent>
      </Card>
    );

  if (phase === 'report') {
    const domains: DomainResult[] = topics
      .filter((t) => ARK_RE_BLUEPRINT_WEIGHT[t.id])
      .map((t) => {
        const r = results.get(t.id) ?? { correct: 0, asked: 0 };
        const prof = profiles.find((p) => p.topicId === t.id);
        return {
          topicId: t.id,
          label: t.label,
          weight: ARK_RE_BLUEPRINT_WEIGHT[t.id],
          correct: r.correct,
          asked: r.asked,
          mastery: prof?.mastery ?? 0,
        };
      });
    const totalCorrect = [...results.values()].reduce((s, r) => s + r.correct, 0);
    const weak = domains
      .filter((d) => d.asked > 0 && d.correct / d.asked < 0.7)
      .sort((a, b) => a.correct / a.asked - b.correct / b.asked);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              Diagnostic: {totalCorrect}/10 ({(totalCorrect * 10).toFixed(0)}%)
            </CardTitle>
            <CardDescription>
              {totalCorrect >= 9
                ? 'Exam-ready trajectory. Keep drilling the statutory number cluster to protect the scaled-70 floor.'
                : totalCorrect >= 7
                  ? 'Passing range, but the domains below are leaking points. Target them before a full sim.'
                  : 'Below the line. The remediation list is your next three lessons — work the queue bottom-up.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {weak.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">Prescribed remediation:</p>
                <div className="flex flex-wrap gap-2">
                  {weak.map((d) => (
                    <Badge key={d.topicId} variant="destructive">
                      {d.label} — missed {d.asked - d.correct}/{d.asked}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={onDone}>Back to overview</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blueprint domain breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {domains.map((d) => (
              <div key={d.topicId} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>
                    {d.label} <span className="text-muted-foreground">(blueprint weight {d.weight})</span>
                  </span>
                  <span>
                    {d.asked > 0 ? `${d.correct}/${d.asked}` : 'not sampled'} · mastery {d.mastery}
                  </span>
                </div>
                <Progress value={d.asked > 0 ? (d.correct / d.asked) * 100 : 0} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!q) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardDescription>
            Question {idx + 1} of {questions.length}
          </CardDescription>
          {topic && <Badge variant="outline">{topic.label}</Badge>}
        </div>
        <Progress value={(idx / questions.length) * 100} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base font-medium leading-relaxed">{q.prompt}</p>
        <div className="space-y-2">
          {q.choices.map((c, i) => {
            let cls = 'justify-start text-left w-full';
            if (picked !== null) {
              if (i === q.answerIndex) cls += ' bg-green-100 dark:bg-green-950 border-green-500';
              else if (i === picked) cls += ' bg-red-100 dark:bg-red-950 border-red-500';
            }
            return (
              <Button key={i} variant="outline" className={cls} onClick={() => choose(i)}>
                <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                {c}
              </Button>
            );
          })}
        </div>
        {picked !== null && (
          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">{q.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
