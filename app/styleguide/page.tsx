'use client';

/**
 * /styleguide — Karsa design token & component reference.
 * Shows every token and component in all states. Axe contrast test runs here.
 */

import { useState } from 'react';
import {
  Check, X, Trophy, Medal, AlertTriangle, Info, Star,
  UserPlus, MessageSquare, BarChart2, Cloud, Users, HelpCircle,
  ChevronRight, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart } from '@/features/projector/BarChart';

const SLIDE_TYPES = [
  { key: 'materi',   label: 'Materi',             color: '#60A5FA', icon: Info },
  { key: 'pilihan',  label: 'Pilihan Ganda',       color: '#A78BFA', icon: Check },
  { key: 'polling',  label: 'Polling',             color: '#FB923C', icon: BarChart2 },
  { key: 'awan',     label: 'Awan Kata',           color: '#FFD93D', icon: Cloud },
  { key: 'tanya',    label: 'Q&A',                 color: '#FF8FCB', icon: HelpCircle },
  { key: 'kelompok', label: 'Pembagian Kelompok',  color: '#2DD4BF', icon: Users },
  { key: 'kuis',     label: 'Kuis',                color: '#B8F25B', icon: Star },
] as const;

const CHART_COLORS = [
  { var: '--chart-1', hex: '#00C6D6', label: 'chart-1 (cyan)' },
  { var: '--chart-2', hex: '#FFD93D', label: 'chart-2 (yellow)' },
  { var: '--chart-3', hex: '#FF8FCB', label: 'chart-3 (pink)' },
  { var: '--chart-4', hex: '#A78BFA', label: 'chart-4 (lavender)' },
  { var: '--chart-5', hex: '#FB923C', label: 'chart-5 (orange)' },
  { var: '--chart-6', hex: '#60A5FA', label: 'chart-6 (blue)' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-black border-b-4 border-black pb-2">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 items-center">
      <div
        className="w-16 h-16 rounded border-3 border-black shadow-[3px_3px_0_0_#000]"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-bold text-center leading-tight max-w-[72px]">{label}</span>
      <span className="text-[10px] text-foreground/60 font-mono">{color}</span>
    </div>
  );
}

export default function StyleguidePage() {
  const [inputVal, setInputVal] = useState('');
  const [textareaVal, setTextareaVal] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const bars2 = [
    { label: 'Opsi A', count: 14, isCorrect: true },
    { label: 'Opsi B', count: 8 },
  ];
  const bars4 = [
    { label: 'Setuju', count: 22, isCorrect: true },
    { label: 'Kurang setuju', count: 9 },
    { label: 'Tidak setuju', count: 4 },
    { label: 'Abstain', count: 3 },
  ];
  const bars6 = [
    { label: 'A', count: 18 },
    { label: 'B', count: 12, isCorrect: true },
    { label: 'C', count: 7 },
    { label: 'D', count: 4 },
    { label: 'E', count: 2 },
    { label: 'F', count: 1 },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-12">
      <header className="border-b-4 border-black pb-6">
        <h1 className="text-5xl font-black">Karsa Design System</h1>
        <p className="text-lg mt-2 text-foreground/70">Token & Component Reference — /styleguide</p>
      </header>

      {/* ── Color Tokens ─────────────────────────────────────────────────── */}
      <Section title="Color Tokens">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-bold mb-3 text-foreground/60 uppercase tracking-wider">Base Surfaces</p>
            <div className="flex flex-wrap gap-4">
              <Swatch color="hsl(46,88%,93%)" label="background (cream)" />
              <Swatch color="#ffffff" label="secondary-background (white)" />
              <Swatch color="hsl(190,100%,45%)" label="main (cyan)" />
              <Swatch color="#34D399" label="success (mint)" />
              <Swatch color="#FF6B5B" label="error / destructive (coral)" />
            </div>
          </div>

          <div>
            <p className="text-sm font-bold mb-3 text-foreground/60 uppercase tracking-wider">Slide Type Colors (chips only)</p>
            <div className="flex flex-wrap gap-4">
              {SLIDE_TYPES.map((t) => (
                <Swatch key={t.key} color={t.color} label={t.label} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold mb-3 text-foreground/60 uppercase tracking-wider">Chart Bar Colors (bar charts only)</p>
            <div className="flex flex-wrap gap-4">
              {CHART_COLORS.map((c) => (
                <Swatch key={c.var} color={c.hex} label={c.label} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Slide Type Chips ──────────────────────────────────────────────── */}
      <Section title="Slide Type Chips">
        <div className="flex flex-wrap gap-3">
          {SLIDE_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <span
                key={t.key}
                className="inline-flex items-center gap-1.5 rounded-base border-[3px] border-black px-3 py-1.5 text-sm font-bold shadow-[3px_3px_0_0_#000]"
                style={{ backgroundColor: t.color }}
              >
                <Icon className="size-4" strokeWidth={2.5} />
                {t.label}
              </span>
            );
          })}
        </div>
        <p className="text-sm text-foreground/60">WCAG AA check (black text): all ≥7.5:1 contrast ratio.</p>
      </Section>

      {/* ── Buttons ───────────────────────────────────────────────────────── */}
      <Section title="Buttons">
        <Card>
          <CardContent className="flex flex-wrap gap-3 pt-6">
            <Button>Primary (Buka Aktivitas)</Button>
            <Button variant="neutral">Secondary (Netral)</Button>
            <Button variant="reverse">Reverse</Button>
            <Button style={{ backgroundColor: '#FF6B5B', borderColor: '#000', color: '#000' }}>
              <Trash2 className="size-4 mr-1" strokeWidth={2.5} />
              Destructive
            </Button>
            <Button disabled>Disabled</Button>
          </CardContent>
        </Card>
        <p className="text-sm text-foreground/60">Disabled: gray fill, never washed-out accent. Min-height 40px.</p>
      </Section>

      {/* ── Inputs ───────────────────────────────────────────────────────── */}
      <Section title="Inputs">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 max-w-md">
            <Input
              placeholder="Teks placeholder"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
            <Input value="Nilai terisi" onChange={() => {}} />
            <Input disabled value="Input dinonaktifkan" onChange={() => {}} />
            <Input className="border-error" placeholder="State error" />
            <Textarea
              placeholder="Textarea placeholder"
              value={textareaVal}
              onChange={(e) => setTextareaVal(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>
      </Section>

      {/* ── Cards ──────────────────────────────────────────────────────────── */}
      <Section title="Cards">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Judul Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/70">Card selalu putih di atas latar krem. Border 3px, shadow 4–6px.</p>
            </CardContent>
          </Card>
          <Card className="border-main shadow-[4px_4px_0_0_var(--main)]">
            <CardHeader>
              <CardTitle>Card Aksen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/70">Variasi dengan warna border dan shadow aksen.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ── Badges ──────────────────────────────────────────────────────────── */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-3 items-center">
          <Badge>Default</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge className="bg-error border-black text-black">Destructive</Badge>
          <span className="inline-flex items-center rounded-base border-[3px] border-black px-3 py-1 text-sm font-bold shadow-[3px_3px_0_0_#000] bg-main">
            Aktif
          </span>
          <span className="inline-flex items-center gap-1 rounded-base border-[3px] border-black px-3 py-1 text-sm font-bold shadow-[3px_3px_0_0_#000] bg-[#34D399]">
            <Check className="size-3.5" strokeWidth={2.5} /> Benar
          </span>
          <span className="inline-flex items-center gap-1 rounded-base border-[3px] border-black px-3 py-1 text-sm font-bold shadow-[3px_3px_0_0_#000] bg-red-100 border-red-400 text-red-700">
            <X className="size-3.5" strokeWidth={2.5} /> Salah
          </span>
        </div>
      </Section>

      {/* ── Slide List Items ─────────────────────────────────────────────── */}
      <Section title="Slide List Items">
        <div className="flex flex-col gap-2 max-w-sm">
          {SLIDE_TYPES.slice(0, 3).map((t, i) => (
            <button
              key={t.key}
              onClick={() => setSelected(i)}
              className={`relative text-left p-3 pl-[14px] overflow-hidden rounded-base border-[3px] text-sm font-medium w-full transition-all ${
                selected === i
                  ? 'border-black shadow-[3px_3px_0_0_#000]'
                  : 'border-border hover:border-black'
              }`}
            >
              <span
                className="absolute left-0 top-0 bottom-0 w-[8px]"
                style={{ backgroundColor: t.color }}
              />
              <span className="font-bold">{i + 1}. {t.label}</span>
              {selected === i && (
                <span
                  className="ml-2 inline-flex items-center rounded border-2 border-black px-1.5 py-0.5 text-xs font-bold shadow-[2px_2px_0_0_#000]"
                  style={{ backgroundColor: t.color }}
                >
                  {t.label}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-sm text-foreground/60">Selected: solid border + shadow. Left bar ≥8px. Marker is a full colored chip.</p>
      </Section>

      {/* ── Leaderboard Rows ──────────────────────────────────────────────── */}
      <Section title="Leaderboard Rows">
        <div className="flex flex-col gap-2 max-w-lg">
          {[
            { rank: 1, label: 'Alya', score: 1500, fill: '#FBBF24' },
            { rank: 2, label: 'Bima', score: 1200, fill: '#CBD5E1' },
            { rank: 3, label: 'Citra', score: 1100, fill: '#D97706' },
            { rank: 4, label: 'Dimas', score: 900, fill: '' },
            { rank: 5, label: 'Eka', score: 700, fill: '' },
          ].map((e) => (
            <div
              key={e.rank}
              className={`flex items-center gap-3 p-3 border-[3px] rounded-base ${
                e.fill
                  ? 'border-black shadow-[3px_3px_0_0_#000]'
                  : 'bg-secondary-background border-border'
              }`}
              style={e.fill ? { backgroundColor: e.fill } : {}}
            >
              <span className="text-xl font-black w-8 text-center flex items-center justify-center">
                {e.rank <= 3 ? <Medal className="size-5" strokeWidth={2.5} /> : `#${e.rank}`}
              </span>
              <span className="flex-1 font-semibold">{e.label}</span>
              <span className="font-black">{e.score} pts</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-foreground/60">Medal colors distinct from slide type palette. Black text on all fills passes AA.</p>
      </Section>

      {/* ── Bar Chart ─────────────────────────────────────────────────────── */}
      <Section title="Bar Chart">
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-sm font-bold mb-2 text-foreground/60">2 opsi · 1 benar</p>
            <Card>
              <CardContent className="pt-6">
                <BarChart bars={bars2} total={bars2.reduce((s, b) => s + b.count, 0)} />
              </CardContent>
            </Card>
          </div>
          <div>
            <p className="text-sm font-bold mb-2 text-foreground/60">4 opsi · 1 benar</p>
            <Card>
              <CardContent className="pt-6">
                <BarChart bars={bars4} total={bars4.reduce((s, b) => s + b.count, 0)} />
              </CardContent>
            </Card>
          </div>
          <div>
            <p className="text-sm font-bold mb-2 text-foreground/60">6 opsi · 1 benar</p>
            <Card>
              <CardContent className="pt-6">
                <BarChart bars={bars6} total={bars6.reduce((s, b) => s + b.count, 0)} />
              </CardContent>
            </Card>
          </div>
          <p className="text-sm text-foreground/60">Chart colors (chart-1..6) are distinct from slide type colors and never used as type chips.</p>
        </div>
      </Section>

      {/* ── Icons ─────────────────────────────────────────────────────────── */}
      <Section title="Icons (lucide-react strokeWidth=2.5)">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6">
              {[
                { icon: Check, label: 'Check' },
                { icon: X, label: 'X' },
                { icon: Trophy, label: 'Trophy' },
                { icon: Medal, label: 'Medal' },
                { icon: AlertTriangle, label: 'AlertTriangle' },
                { icon: Info, label: 'Info' },
                { icon: UserPlus, label: 'UserPlus' },
                { icon: MessageSquare, label: 'MessageSquare' },
                { icon: BarChart2, label: 'BarChart2' },
                { icon: Cloud, label: 'Cloud' },
                { icon: Users, label: 'Users' },
                { icon: HelpCircle, label: 'HelpCircle' },
                { icon: ChevronRight, label: 'ChevronRight' },
                { icon: Trash2, label: 'Trash2' },
                { icon: Star, label: 'Star' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className="p-3 border-[3px] border-black rounded-base shadow-[3px_3px_0_0_#000] bg-secondary-background hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer">
                    <Icon className="size-6" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs font-medium text-foreground/70">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <p className="text-sm text-foreground/60">All icons: lucide-react, strokeWidth 2.5. Hover: neo-brutalism lift (translate + shadow off). No emoji or check/cross glyphs anywhere in source.</p>
      </Section>

      {/* ── Progress ──────────────────────────────────────────────────────── */}
      <Section title="Progress">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 max-w-md">
            <Progress value={0} className="h-3" />
            <Progress value={33} className="h-3" />
            <Progress value={67} className="h-3" />
            <Progress value={100} className="h-3" />
          </CardContent>
        </Card>
      </Section>

      {/* ── Typography ─────────────────────────────────────────────────────── */}
      <Section title="Typography">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <h1 className="text-4xl font-black">Heading 1 — font-black</h1>
            <h2 className="text-3xl font-black">Heading 2 — font-black</h2>
            <h3 className="text-2xl font-bold">Heading 3 — font-bold</h3>
            <p className="text-base">Body text 16px — minimum for content. Lorem ipsum dolor sit amet.</p>
            <p className="text-sm">Small text (14px) — metadata only, not content.</p>
            <p className="text-foreground/60 text-sm">Muted text — foreground/60 minimum for non-critical labels.</p>
          </CardContent>
        </Card>
        <p className="text-sm text-foreground/60">Base text 16px (no text-xs for content). Headings font-weight 800.</p>
      </Section>
    </main>
  );
}
