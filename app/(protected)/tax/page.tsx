import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TaxPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Quarterly estimates and deductions, scoped by authenticated user.</CardContent>
    </Card>
  );
}
