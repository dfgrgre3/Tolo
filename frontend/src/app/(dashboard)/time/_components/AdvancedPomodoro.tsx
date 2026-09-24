'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onSessionComplete?: (minutes: number) => void;
}

function beep(freq = 880, dur = 0.25) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur);
  } catch { /* ignore */ }
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function AdvancedPomodoro({ onSessionComplete }: Props) {
  const [work, setWork] = useState(25);
  const [shortB, setShortB] = useState(5);
  const [longB, setLongB] = useState(15);
  const [cycles, setCycles] = useState(4);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [sound, setSound] = useState(true);

  const [phase, setPhase] = useState<'work' | 'short' | 'long'>('work');
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const phaseStartedAt = useRef<number | null>(null);
  const elapsedBeforeRun = useRef(0);

  const phaseLen = phase === 'work' ? work * 60 : phase === 'short' ? shortB * 60 : longB * 60;

  useEffect(() => {
    // Settings define the next phase; never rewrite elapsed time of a running phase.
    if (!running) {
      setLeft(phaseLen);
      elapsedBeforeRun.current = 0;
      phaseStartedAt.current = null;
    }
  }, [work, shortB, longB, phase, running, phaseLen]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (phaseStartedAt.current === null) phaseStartedAt.current = Date.now();
      const elapsed = elapsedBeforeRun.current + Math.floor((Date.now() - phaseStartedAt.current) / 1000);
      const nextLeft = Math.max(0, phaseLen - elapsed);
      if (nextLeft === left) return;
      if (nextLeft > 0) { setLeft(nextLeft); return; }
      elapsedBeforeRun.current = 0;
      phaseStartedAt.current = null;
      if (sound) beep(phase === 'work' ? 880 : 520, 0.4);
      if (phase === 'work') {
        const nd = done + 1;
        setDone(nd);
        onSessionComplete?.(work);
        toast.success(`اكتملت جلسة تركيز #${nd} (${work} دقيقة)`);
        const next = nd % cycles === 0 ? 'long' : 'short';
        setPhase(next);
        if (!autoSwitch) setRunning(false);
        setLeft(next === 'long' ? longB * 60 : shortB * 60);
      } else {
        toast.success('انتهت الاستراحة — جاهز للتركيز؟');
        setPhase('work');
        if (!autoSwitch) setRunning(false);
        setLeft(work * 60);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [running, phase, phaseLen, work, shortB, longB, cycles, autoSwitch, sound, done, onSessionComplete, left]);

  useEffect(() => {
    document.title = running ? `${fmt(left)} • ${phase === 'work' ? 'تركيز' : 'استراحة'} | ثانوي` : 'إدارة الوقت | ثانوي';
  }, [left, running, phase]);

  const reset = () => {
    setRunning(false);
    elapsedBeforeRun.current = 0;
    phaseStartedAt.current = null;
    setLeft(phaseLen);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" dir="rtl">
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-foreground text-base font-bold">
          {phase === 'work' ? 'جلسة تركيز عميق' : phase === 'short' ? 'استراحة قصيرة' : 'استراحة طويلة'}
          <span className="text-xs text-muted-foreground font-normal ms-2">جلسات مكتملة: {done}/{cycles}</span>
        </h3>
        <div className="flex flex-col items-center py-6">
          <div className="text-7xl font-mono font-black text-foreground tabular-nums" dir="ltr">{fmt(left)}</div>
          <div className="w-full max-w-md h-2 rounded-full bg-muted mt-4 overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${Math.round((1 - left / phaseLen) * 100)}%` }} />
          </div>
          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: cycles }).map((_, i) => (
              <div key={i} className={`h-2.5 w-2.5 rounded-full ${i < done % cycles || (done > 0 && done % cycles === 0) ? 'bg-orange-500' : 'bg-muted'}`} />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-6">
            <Button variant="ghost" size="icon" onClick={reset} aria-label="إعادة ضبط جلسة التركيز" className="rounded-full border border-border"><RotateCcw className="h-5 w-5" /></Button>
            <Button onClick={() => setRunning(r => !r)} className={`h-14 px-10 rounded-2xl font-bold ${running ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
              {running ? <><Pause className="h-5 w-5 ms-2" /> إيقاف مؤقت</> : <><Play className="h-5 w-5 ms-2" /> بدء التركيز</>}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { setPhase(phase === 'work' ? 'short' : 'work'); setRunning(false); elapsedBeforeRun.current = 0; phaseStartedAt.current = null; }} aria-label="تخطي المرحلة الحالية" className="rounded-full border border-border"><SkipForward className="h-5 w-5" /></Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">نصيحة: ضع هاتفك على الصامت، وركز على مهمة واحدة فقط.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-foreground text-sm font-bold">إعدادات البومودورو</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">مدة التركيز (دقيقة)</Label>
            <Input type="number" min={5} max={120} value={work} onChange={e => setWork(Math.max(1, parseInt(e.target.value) || 25))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">استراحة قصيرة</Label>
              <Input type="number" min={1} max={30} value={shortB} onChange={e => setShortB(Math.max(1, parseInt(e.target.value) || 5))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">استراحة طويلة</Label>
              <Input type="number" min={5} max={60} value={longB} onChange={e => setLongB(Math.max(1, parseInt(e.target.value) || 15))} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">جلسات قبل الاستراحة الطويلة</Label>
            <Input type="number" min={2} max={8} value={cycles} onChange={e => setCycles(Math.max(2, parseInt(e.target.value) || 4))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">انتقال تلقائي بين المراحل</Label>
            <Switch checked={autoSwitch} onCheckedChange={setAutoSwitch} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">{sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />} صوت التنبيه</Label>
            <Switch checked={sound} onCheckedChange={setSound} />
          </div>
          <p className="text-xs text-muted-foreground leading-6">
            القاعدة الذهبية: 25 د تركيز + 5 د راحة × 4 = ثم راحة طويلة 15-30 دقيقة.
          </p>
        </div>
      </div>
    </div>
  );
}
