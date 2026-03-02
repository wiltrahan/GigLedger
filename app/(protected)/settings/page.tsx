import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <Card className="dashboard-panel rounded-[28px] border-white/10 text-slate-100">
      <CardHeader>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--dashboard-accent)]">Settings</p>
          <CardTitle className="mt-2 text-2xl text-white">Account and preferences</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-slate-400">Account and preferences settings.</CardContent>
    </Card>
  );
}
