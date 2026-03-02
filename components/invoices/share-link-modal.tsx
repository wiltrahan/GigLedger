"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  link: string;
  onClose: () => void;
};

export function ShareLinkModal({ open, link, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="dashboard-panel-strong w-full max-w-xl rounded-[28px] border-white/10 text-slate-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Invoice Share Link</CardTitle>
          <Button className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" variant="outline" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-400">Token link generated. Share this with the client:</p>
          <Input className="dashboard-input" readOnly value={link} />
          <div className="flex justify-end">
            <Button
              className="bg-[var(--dashboard-accent)] text-slate-950 hover:bg-[var(--dashboard-accent-strong)]"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
              }}
            >
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
