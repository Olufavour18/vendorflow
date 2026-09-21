"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
import { slugify } from "@/lib/product-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
};

type Props = {
  initialCategories: CategoryRow[];
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  parent_id: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  slug: "",
  description: "",
  parent_id: "",
  sort_order: "0",
  is_active: true,
});

/** Collect id and all descendant ids (for cycle prevention). */
function collectDescendantIds(
  categories: CategoryRow[],
  rootId: string
): Set<string> {
  const byParent = new Map<string | null, CategoryRow[]>();
  for (const c of categories) {
    const key = c.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    out.add(id);
    for (const child of byParent.get(id) || []) {
      if (!out.has(child.id)) stack.push(child.id);
    }
  }
  return out;
}

export function CategoryHierarchy({ initialCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const roots = useMemo(() => {
    const sorted = [...categories].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
    );
    return sorted.filter((c) => !c.parent_id);
  }, [categories]);

  const childrenOf = (parentId: string) =>
    categories
      .filter((c) => c.parent_id === parentId)
      .sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
      );

  /** Parents available for the form (exclude self + descendants when editing). */
  const parentOptions = useMemo(() => {
    if (!form.id) return categories;
    const blocked = collectDescendantIds(categories, form.id);
    return categories.filter((c) => !blocked.has(c.id));
  }, [categories, form.id]);

  const startCreate = (parentId?: string) => {
    setEditing(true);
    setError(null);
    setSuccess(null);
    setForm({
      ...emptyForm(),
      parent_id: parentId || "",
      sort_order: "0",
    });
  };

  const startEdit = (c: CategoryRow) => {
    setEditing(true);
    setError(null);
    setSuccess(null);
    setForm({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      parent_id: c.parent_id || "",
      sort_order: String(c.sort_order ?? 0),
      is_active: c.is_active,
    });
  };

  const cancelForm = () => {
    setEditing(false);
    setForm(emptyForm());
    setError(null);
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.id ? prev.slug : slugify(name),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const name = form.name.trim();
    if (!name) {
      setError("Name is required.");
      setSaving(false);
      return;
    }

    let slug = form.slug.trim() || slugify(name);
    if (!slug) {
      setError("Slug is required.");
      setSaving(false);
      return;
    }

    const parent_id = form.parent_id || null;
    if (form.id && parent_id === form.id) {
      setError("A category cannot be its own parent.");
      setSaving(false);
      return;
    }

    const payload = {
      name,
      slug,
      description: form.description.trim() || null,
      parent_id,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    const supabase = createClient();

    if (form.id) {
      const { data, error: uErr } = await supabase
        .from("categories")
        .update(payload)
        .eq("id", form.id)
        .select("*")
        .maybeSingle();

      if (uErr) {
        setError(formatSupabaseError(uErr));
        setSaving(false);
        return;
      }
      if (!data) {
        setError("Update blocked (RLS). Confirm your account role is admin.");
        setSaving(false);
        return;
      }
      setCategories((list) =>
        list.map((c) => (c.id === form.id ? (data as CategoryRow) : c))
      );
      setSuccess(`Updated “${data.name}”.`);
    } else {
      const { data, error: iErr } = await supabase
        .from("categories")
        .insert(payload)
        .select("*")
        .single();

      if (iErr) {
        setError(formatSupabaseError(iErr));
        setSaving(false);
        return;
      }
      setCategories((list) => [...list, data as CategoryRow]);
      setSuccess(`Created “${data.name}”.`);
    }

    setSaving(false);
    setEditing(false);
    setForm(emptyForm());
    router.refresh();
  };

  const toggleActive = async (c: CategoryRow) => {
    setError(null);
    const supabase = createClient();
    const { data, error: uErr } = await supabase
      .from("categories")
      .update({ is_active: !c.is_active })
      .eq("id", c.id)
      .select("*")
      .maybeSingle();

    if (uErr || !data) {
      setError(formatSupabaseError(uErr, "Could not update status."));
      return;
    }
    setCategories((list) =>
      list.map((x) => (x.id === c.id ? (data as CategoryRow) : x))
    );
    router.refresh();
  };

  const handleDelete = async (c: CategoryRow) => {
    const kids = childrenOf(c.id);
    if (kids.length > 0) {
      setError(
        `“${c.name}” has ${kids.length} subcategory(ies). Move or delete them first, or deactivate instead.`
      );
      return;
    }
    if (
      !confirm(
        `Delete category “${c.name}”? Products linked to it will keep their data but lose this category.`
      )
    ) {
      return;
    }
    setError(null);
    const supabase = createClient();
    const { error: dErr } = await supabase
      .from("categories")
      .delete()
      .eq("id", c.id);

    if (dErr) {
      setError(formatSupabaseError(dErr));
      return;
    }
    setCategories((list) => list.filter((x) => x.id !== c.id));
    setSuccess(`Deleted “${c.name}”.`);
    router.refresh();
  };

  const renderNode = (c: CategoryRow, depth: number) => {
    const kids = childrenOf(c.id);
    return (
      <div key={c.id} className="space-y-1">
        <div
          className={`flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border bg-background p-3 ${
            !c.is_active ? "opacity-60" : ""
          }`}
          style={{ marginLeft: depth * 16 }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-muted-foreground font-mono">
                /{c.slug}
              </span>
              {!c.is_active && (
                <span className="text-xs rounded-full bg-muted px-2 py-0.5">
                  Inactive
                </span>
              )}
              {depth === 0 && (
                <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">
                  Top level
                </span>
              )}
            </div>
            {c.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                {c.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Sort: {c.sort_order}
              {kids.length > 0 ? ` · ${kids.length} sub` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => startCreate(c.id)}
            >
              Add sub
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => startEdit(c)}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => toggleActive(c)}
            >
              {c.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => handleDelete(c)}
            >
              Delete
            </Button>
          </div>
        </div>
        {kids.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">
            Manage top-level categories and subcategories. Vendors pick these
            when adding products.
          </p>
        </div>
        <Button type="button" onClick={() => startCreate()}>
          Add category
        </Button>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-800 bg-green-50 rounded-md">
          {success}
        </div>
      )}

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {form.id ? "Edit category" : "New category"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name *</Label>
                <Input
                  id="cat-name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  placeholder="e.g. Foodstuff or Rice"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-slug">Slug *</Label>
                <Input
                  id="cat-slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, slug: slugify(e.target.value) }))
                  }
                  required
                  placeholder="foodstuff"
                />
                <p className="text-xs text-muted-foreground">
                  URL-friendly unique code. Must be unique across all categories.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-parent">Parent category</Label>
                <select
                  id="cat-parent"
                  value={form.parent_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, parent_id: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Top level (no parent) —</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent_id ? `↳ ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-sort">Sort order</Label>
                  <Input
                    id="cat-sort"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, sort_order: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-active">Status</Label>
                  <select
                    id="cat-active"
                    value={form.is_active ? "1" : "0"}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        is_active: e.target.value === "1",
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description</Label>
                <textarea
                  id="cat-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : form.id ? "Save changes" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No categories yet. Add a top-level category to get started.
            </CardContent>
          </Card>
        ) : (
          roots.map((r) => renderNode(r, 0))
        )}
      </div>

      {categories.filter(
        (c) =>
          c.parent_id && !categories.some((p) => p.id === c.parent_id)
      ).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Orphaned (parent missing)
          </h2>
          {categories
            .filter(
              (c) =>
                c.parent_id && !categories.some((p) => p.id === c.parent_id)
            )
            .map((c) => renderNode(c, 0))}
        </div>
      )}
    </div>
  );
}
