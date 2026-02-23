"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Client = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  billing_address?: string | null;
  notes?: string | null;
  created_at: string;
};

type ClientForm = {
  name: string;
  email: string;
  phone: string;
  billing_address: string;
  notes: string;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
    details?: {
      formErrors?: string[];
      fieldErrors?: Record<string, string[] | undefined>;
    } | null;
  };
};

function emptyForm(): ClientForm {
  return {
    name: "",
    email: "",
    phone: "",
    billing_address: "",
    notes: ""
  };
}

function extractApiErrorMessage(payload: ApiErrorResponse | undefined, fallback: string) {
  const baseMessage = payload?.error?.message ?? fallback;
  const details = payload?.error?.details;

  if (!details) return baseMessage;

  const formMessage = details.formErrors?.find((message) => Boolean(message?.trim()));
  if (formMessage) return formMessage;

  const fields = Object.entries(details.fieldErrors ?? {});
  for (const [field, messages] of fields) {
    const first = messages?.find((message) => Boolean(message?.trim()));
    if (first) return `${field}: ${first}`;
  }

  return baseMessage;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

export function ClientsClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm());

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/clients", { cache: "no-store" });
    const json = (await response.json()) as ApiErrorResponse & { data?: Client[] };

    if (!response.ok) {
      setError(extractApiErrorMessage(json, "Failed to load clients."));
      setLoading(false);
      return;
    }

    setClients(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    const target = search.trim().toLowerCase();
    if (!target) return clients;

    return clients.filter((client) => {
      return (
        client.name.toLowerCase().includes(target) ||
        (client.email ?? "").toLowerCase().includes(target) ||
        (client.phone ?? "").toLowerCase().includes(target)
      );
    });
  }, [clients, search]);

  function openCreateModal() {
    setEditingClient(null);
    setForm(emptyForm());
    setModalOpen(true);
    setError(null);
    setSuccess(null);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      billing_address: client.billing_address ?? "",
      notes: client.notes ?? ""
    });
    setModalOpen(true);
    setError(null);
    setSuccess(null);
  }

  async function submitClient() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      billing_address: form.billing_address || null,
      notes: form.notes || null
    };

    const isEdit = Boolean(editingClient);
    const endpoint = isEdit ? `/api/clients/${editingClient!.id}` : "/api/clients";
    const method = isEdit ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = (await response.json()) as ApiErrorResponse;
    if (!response.ok) {
      setError(extractApiErrorMessage(json, isEdit ? "Failed to update client." : "Failed to create client."));
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    setSuccess(isEdit ? "Client updated." : "Client created.");
    await loadClients();
  }

  async function deleteClient(client: Client) {
    const confirmed = window.confirm(`Delete client \"${client.name}\"?`);
    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    const json = (await response.json()) as ApiErrorResponse;

    if (!response.ok) {
      setError(extractApiErrorMessage(json, "Failed to delete client."));
      return;
    }

    setSuccess("Client deleted.");
    await loadClients();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Clients</CardTitle>
          <Button onClick={openCreateModal}>Add Client</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search clients" value={search} onChange={(event) => setSearch(event.target.value)} />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading clients...</p> : null}

          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-t">
                    <td className="px-4 py-2">{client.name}</td>
                    <td className="px-4 py-2">{client.email || "-"}</td>
                    <td className="px-4 py-2">{client.phone || "-"}</td>
                    <td className="px-4 py-2">{formatDate(client.created_at)}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(client)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void deleteClient(client)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && filteredClients.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>
                      No clients found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingClient ? "Edit Client" : "Add Client"}</CardTitle>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Name</span>
                  <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium">Email</span>
                  <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium">Phone</span>
                  <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                </label>

                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="font-medium">Billing Address</span>
                  <Input value={form.billing_address} onChange={(event) => setForm({ ...form, billing_address: event.target.value })} />
                </label>
              </div>

              <label className="block space-y-2 text-sm">
                <span className="font-medium">Notes</span>
                <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </label>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={saving || !form.name.trim()} onClick={() => void submitClient()}>
                  {saving ? "Saving..." : editingClient ? "Save Changes" : "Create Client"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
