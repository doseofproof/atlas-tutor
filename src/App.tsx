import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PartyPopper, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/providers/trpc';
import type { MasteryProfile, Subject, Topic } from '@/types';
import { DAILY_GOAL } from '@/types';
import { Dashboard } from '@/components/Dashboard';
import { LessonRunner } from '@/components/LessonRunner';
import { TutorChat } from '@/components/TutorChat';
import { ReviewDeck } from '@/components/ReviewDeck';
import { SubjectManager } from '@/components/SubjectManager';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ExamSim } from '@/components/ExamSim';
import { BlueprintReference } from '@/components/BlueprintReference';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

function AtlasApp() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const bootstrap = trpc.atlas.bootstrap.useQuery(undefined, { enabled: isAuthenticated });
  const [subjectId, setSubjectId] = useState<string>('');
  const [lessonRunning, setLessonRunning] = useState(false);
  const [lessonSize, setLessonSize] = useState(5);
  const [goalHit, setGoalHit] = useState(false);
  const prevGoalRef = useRef(false);

  const subjects: Subject[] = (bootstrap.data?.subjects ?? []).map((s) => ({
    id: s.id, name: s.name, description: s.description ?? '', source: s.source,
  }));
  const sid = subjectId || subjects[0]?.id || '';
  const state = trpc.atlas.subjectState.useQuery({ subjectId: sid }, { enabled: !!sid && isAuthenticated });

  const topics: Topic[] = (state.data?.topics ?? []).map((t) => ({
    id: t.id, subjectId: t.subjectId, label: t.label, level: t.level,
    prereqIds: t.prereqIds ?? [], source: t.source,
  }));
  const profiles: MasteryProfile[] = (state.data?.masteryProfiles ?? []).map((p) => ({
    topicId: p.topicId, attempts: p.attempts, correct: p.correct,
    successRate: p.successRate, mastery: p.mastery, mastered: p.mastered, unlocked: p.unlocked,
  }));
  const attempts = state.data?.attempts ?? [];
  const streak = state.data?.streak ?? 0;
  const dueCount = state.data?.dueCount ?? 0;
  const subject = subjects.find((s) => s.id === sid);
  const isArkRe = subject?.id === 'arkansas-re';

  const goalProgress = attempts.filter(
    (a) => a.correct && todayKey(new Date(a.answeredAt)) === todayKey()
  ).length;

  useEffect(() => {
    const hit = goalProgress >= DAILY_GOAL;
    if (hit && !prevGoalRef.current) setGoalHit(true);
    prevGoalRef.current = hit;
  }, [goalProgress]);

  if (authLoading || (isAuthenticated && bootstrap.isLoading) || (sid && state.isLoading)) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl space-y-4 px-4 py-8">
        <div className="h-9 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-24 rounded bg-muted" />
                <CardTitle>
                  <div className="h-8 w-16 rounded bg-muted" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-2 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!subject) return null;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      {goalHit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border-2 border-green-500 bg-card p-8 text-center shadow-xl">
            <PartyPopper className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-4 text-2xl font-bold">Daily goal complete!</p>
            <p className="mt-2 text-muted-foreground">
              You mastered {DAILY_GOAL} items today. You've earned your time back — the rest of the day is yours.
            </p>
            <Button className="mt-6" onClick={() => setGoalHit(false)}>Keep practicing anyway</Button>
          </div>
        </div>
      )}

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atlas Tutor</h1>
          <p className="text-muted-foreground">
            Mastery-based personal tutor — diagnostics find the gaps, practice stays in the 80–85% sweet spot.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-56">
            <Select value={sid} onValueChange={(id) => { setSubjectId(id); setLessonRunning(false); }}>
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{(user?.name ?? 'U').slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              Daily Mastery Goal — {Math.min(goalProgress, DAILY_GOAL)} / {DAILY_GOAL} items mastered
            </p>
            <Progress value={Math.min(100, (goalProgress / DAILY_GOAL) * 100)} className="mt-2" />
          </div>
          {goalProgress >= DAILY_GOAL
            ? <span className="whitespace-nowrap text-sm font-semibold text-green-600">Time earned back</span>
            : <span className="whitespace-nowrap text-sm text-muted-foreground">{DAILY_GOAL - goalProgress} to go</span>}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" onValueChange={(v) => v === 'overview' && state.refetch()}>
        <TabsList className="mb-6 flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lesson">Adaptive Lesson</TabsTrigger>
          <TabsTrigger value="chat">Tutor Chat</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          {isArkRe && <TabsTrigger value="examsim">Exam Sim</TabsTrigger>}
          {isArkRe && <TabsTrigger value="blueprint">Blueprint</TabsTrigger>}
          <TabsTrigger value="new">New Subject</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Dashboard topics={topics} profiles={profiles} streak={streak} dueCount={dueCount} />
        </TabsContent>

        <TabsContent value="lesson">
          {lessonRunning ? (
            <LessonRunner
              subject={subject}
              topics={topics}
              profiles={profiles}
              count={lessonSize}
              onDone={() => { setLessonRunning(false); state.refetch(); }}
            />
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Lesson size:</span>
              {[5, 10].map((c) => (
                <button key={c} onClick={() => setLessonSize(c)}
                  className={`rounded-md border px-3 py-1 text-sm ${lessonSize === c ? 'bg-primary text-primary-foreground' : ''}`}>
                  {c} questions
                </button>
              ))}
              <button onClick={() => setLessonRunning(true)}
                className="rounded-md bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                Start lesson
              </button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat">
          <TutorChat subject={subject} topics={topics} learnerNote={state.data?.learnerNote ?? null} />
        </TabsContent>

        <TabsContent value="review">
          <ReviewDeck subjectId={subject.id} />
        </TabsContent>

        {isArkRe && (
          <TabsContent value="examsim">
            <ExamSim topics={topics} profiles={profiles} onDone={() => state.refetch()} />
          </TabsContent>
        )}

        {isArkRe && (
          <TabsContent value="blueprint">
            <BlueprintReference />
          </TabsContent>
        )}

        <TabsContent value="new">
          <SubjectManager onCreated={(s) => { setSubjectId(s.id); bootstrap.refetch(); }} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsPanel subjectId={subject.id} learnerNote={state.data?.learnerNote ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AtlasApp />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
