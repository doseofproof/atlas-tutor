import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame } from 'lucide-react';
import type { MasteryProfile, Topic } from '@/types';
import { MASTERY_PASS } from '@/types';
function nextUpQueue(profiles: MasteryProfile[], topics: Topic[]): MasteryProfile[] {
  const byId = new Map(topics.map((t) => [t.id, t]));
  return profiles
    .filter((p) => p.unlocked && !p.mastered)
    .sort((a, b) => {
      const ta = byId.get(a.topicId)!;
      const tb = byId.get(b.topicId)!;
      if (ta.level !== tb.level) return ta.level < tb.level ? -1 : 1;
      if ((a.attempts === 0) !== (b.attempts === 0)) return a.attempts === 0 ? -1 : 1;
      return a.mastery - b.mastery;
    });
}

export function Dashboard({
  topics,
  profiles,
  streak,
  dueCount,
}: {
  topics: Topic[];
  profiles: MasteryProfile[];
  streak: number;
  dueCount: number;
}) {
  const queue = nextUpQueue(profiles, topics);
  const masteredCount = profiles.filter((p) => p.mastered).length;
  const byLevel = new Map<string, Topic[]>();
  topics.forEach((t) => {
    const l = byLevel.get(t.level) ?? [];
    l.push(t);
    byLevel.set(t.level, l);
  });
  const profById = new Map(profiles.map((p) => [p.topicId, p]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-500" /> Day streak
            </CardDescription>
            <CardTitle className="text-3xl">{streak}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Short, daily, mastery-focused sessions beat marathon study — consistency is the multiplier.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Topics mastered</CardDescription>
            <CardTitle className="text-3xl">
              {masteredCount} <span className="text-lg text-muted-foreground">/ {topics.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={(masteredCount / Math.max(1, topics.length)) * 100} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Due for review</CardDescription>
            <CardTitle className="text-3xl">{dueCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Spaced-repetition items from your chats and missed questions.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge map</CardTitle>
          <CardDescription>
            Advancement rule: a topic unlocks only when its prerequisites show {MASTERY_PASS}%+ mastery.
            Locked topics are your hidden gaps — fill them from the bottom up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {[...byLevel.entries()].map(([level, ts]) => (
            <div key={level}>
              <p className="mb-2 text-sm font-semibold">Stage {level}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {ts.map((t) => {
                  const p = profById.get(t.id)!;
                  return (
                    <div
                      key={t.id}
                      className={`rounded-md border p-3 ${!p.unlocked ? 'opacity-50' : ''}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{t.label}</span>
                        {p.mastered ? (
                          <Badge>Mastered</Badge>
                        ) : !p.unlocked ? (
                          <Badge variant="outline">Locked — gap above</Badge>
                        ) : p.attempts === 0 ? (
                          <Badge variant="secondary">New</Badge>
                        ) : (
                          <Badge variant="secondary">{p.mastery}/100</Badge>
                        )}
                      </div>
                      <Progress value={p.mastery} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Up next</CardTitle>
          <CardDescription>The lesson engine always pulls from the top of this queue — deepest gap first.</CardDescription>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Everything unlocked is mastered. Spiral review mode is keeping it sharp.
            </p>
          ) : (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {queue.slice(0, 5).map((p) => {
                const t = topics.find((x) => x.id === p.topicId)!;
                return (
                  <li key={p.topicId}>
                    <span className="font-medium">{t.label}</span>{' '}
                    <span className="text-muted-foreground">
                      ({t.level} · {p.attempts} attempts · mastery {p.mastery})
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
