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
    <div className="space-y-4 text-slate-100">
      <Card className="dashboard-panel rounded-[28px] border-white/10">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--dashboard-accent)]">Clients</p>
            <CardTitle className="mt-2 text-2xl text-white">People and billing contacts</CardTitle>
          </div>
          <Button className="rounded-full bg-[var(--dashboard-accent)] text-slate-950 hover:bg-[var(--dashboard-accent-strong)]" onClick={openCreateModal}>Add Client</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input className="dashboard-input" placeholder="Search clients" value={search} onChange={(event) => setSearch(event.target.value)} />

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
          {loading ? <p className="text-sm text-slate-400">Loading clients...</p> : null}

          <div className="dashboard-table-wrap overflow-x-auto rounded-[22px]">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
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
                  <tr key={client.id} className="border-t border-white/5 text-slate-200">
                    <td className="px-4 py-2">{client.name}</td>
                    <td className="px-4 py-2">{client.email || "-"}</td>
                    <td className="px-4 py-2">{client.phone || "-"}</td>
                    <td className="px-4 py-2">{formatDate(client.created_at)}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" size="sm" variant="outline" onClick={() => openEditModal(client)}>
                          Edit
                        </Button>
                        <Button className="bg-rose-500/80 text-white hover:bg-rose-500" size="sm" variant="destructive" onClick={() => void deleteClient(client)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && filteredClients.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-400" colSpan={5}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="dashboard-panel-strong w-full max-w-2xl rounded-[28px] border-white/10 text-slate-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">{editingClient ? "Edit Client" : "Add Client"}</CardTitle>
              <Button className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" variant="outline" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Name</span>
                  <Input className="dashboard-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium">Email</span>
                  <Input className="dashboard-input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium">Phone</span>
                  <Input className="dashboard-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                </label>

                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="font-medium">Billing Address</span>
                  <Input className="dashboard-input" value={form.billing_address} onChange={(event) => setForm({ ...form, billing_address: event.target.value })} />
                </label>
              </div>

              <label className="block space-y-2 text-sm">
                <span className="font-medium">Notes</span>
                <Textarea className="dashboard-input min-h-[100px]" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </label>

              <div className="flex justify-end gap-2">
                <Button className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-[var(--dashboard-accent)] text-slate-950 hover:bg-[var(--dashboard-accent-strong)]" disabled={saving || !form.name.trim()} onClick={() => void submitClient()}>
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
