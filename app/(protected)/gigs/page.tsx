import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GigsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gigs</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">RLS-scoped gig CRUD will live here.</CardContent>
    </Card>
  );
}
