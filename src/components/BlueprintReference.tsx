import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EXAM_ADMIN, MATH_RULES, STATUTORY_TRAPS } from '@/data/arkansasRe';

/** Static blueprint reference — exam-day facts, statutory trap numbers, math rules. */
export function BlueprintReference() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exam architecture</CardTitle>
          <CardDescription>
            Pearson VUE under AREC authority. 15 unscored pre-test items (5 national, 10 state) are mixed in
            invisibly — answer every question as if it counts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>National</TableHead>
                <TableHead>Arkansas State</TableHead>
                <TableHead>Combined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Scored questions</TableCell>
                <TableCell>{EXAM_ADMIN.scoredNational}</TableCell>
                <TableCell>{EXAM_ADMIN.scoredState}</TableCell>
                <TableCell>{EXAM_ADMIN.scoredNational + EXAM_ADMIN.scoredState}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Unscored pre-test items</TableCell>
                <TableCell>{EXAM_ADMIN.pretestNational}</TableCell>
                <TableCell>{EXAM_ADMIN.pretestState}</TableCell>
                <TableCell>{EXAM_ADMIN.pretestNational + EXAM_ADMIN.pretestState}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Passing threshold</TableCell>
                <TableCell>{EXAM_ADMIN.passScaled} scaled</TableCell>
                <TableCell>{EXAM_ADMIN.passScaled} scaled</TableCell>
                <TableCell>Each section independently</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell colSpan={2} className="text-center">integrated</TableCell>
                <TableCell>{EXAM_ADMIN.totalTimeMin} minutes ({(EXAM_ADMIN.totalTimeMin / 60).toFixed(0)} hrs)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Partial pass window</TableCell>
                <TableCell colSpan={2} className="text-center">{EXAM_ADMIN.partialPassMonths} calendar months</TableCell>
                <TableCell>retake failed section only</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Post-exam filing</TableCell>
                <TableCell colSpan={2}></TableCell>
                <TableCell>{EXAM_ADMIN.filingWindowDays} days — results void after</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Overall eligibility</TableCell>
                <TableCell colSpan={2}></TableCell>
                <TableCell>{EXAM_ADMIN.eligibilityMonths} months from AREC approval</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statutory number traps</CardTitle>
          <CardDescription>
            Pearson VUE builds distractors from adjacent numbers in this exact cluster — anchor each one to its
            statute and rule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {STATUTORY_TRAPS.map((t) => (
                <TableRow key={t.label}>
                  <TableCell className="font-medium">{t.label}</TableCell>
                  <TableCell>{t.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Math rules</CardTitle>
          <CardDescription>
            Arkansas-specific: transfer tax is $3.30 per $1,000 split 50/50 — the two errors the exam is
            engineered to catch are pricing points off the sales price and forgetting the split.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Calculation</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead>Citation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MATH_RULES.map((m) => (
                <TableRow key={m.name}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="font-mono text-xs">{m.formula}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.cite}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
