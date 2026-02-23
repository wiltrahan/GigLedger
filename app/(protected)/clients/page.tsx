import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Clients</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">RLS-scoped client CRUD will live here.</CardContent>
    </Card>
  );
}
