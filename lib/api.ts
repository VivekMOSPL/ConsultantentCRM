import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Customer,
  LineItem,
  Oem,
  OemShipment,
  QuoteLine,
  RequirementOem,
  RequirementSummary,
  Stage,
} from "./types";

export type DataBundle = {
  customers: Customer[];
  oems: Oem[];
  requirements: RequirementSummary[];
  lineItems: LineItem[];
  reqOems: RequirementOem[];
  shipments: OemShipment[];
  quoteLines: QuoteLine[];
  followUp: RequirementSummary[];
};

type Result<T> = { data: T | null; error: { message: string } | null };

function firstError(results: Result<unknown>[]): string | null {
  for (const r of results) {
    if (r.error) return r.error.message;
  }
  return null;
}

export async function loadAll(supabase: SupabaseClient): Promise<{
  data: DataBundle | null;
  error: string | null;
}> {
  const [customers, oems, requirements, lineItems, reqOems, shipments, quoteLines, followUp] =
    await Promise.all([
      supabase.from("customers").select("*").order("name") as unknown as Promise<Result<Customer[]>>,
      supabase.from("oems").select("*").order("name") as unknown as Promise<Result<Oem[]>>,
      supabase
        .from("requirement_summary")
        .select("*")
        .order("submission_deadline", { ascending: true }) as unknown as Promise<
        Result<RequirementSummary[]>
      >,
      supabase
        .from("line_items")
        .select("*")
        .order("created_at") as unknown as Promise<Result<LineItem[]>>,
      supabase.from("requirement_oems").select("*") as unknown as Promise<Result<RequirementOem[]>>,
      supabase
        .from("oem_shipments")
        .select("*")
        .order("expected_shipment_date") as unknown as Promise<Result<OemShipment[]>>,
      supabase.from("customer_quote_lines").select("*") as unknown as Promise<Result<QuoteLine[]>>,
      supabase.from("follow_up_today").select("*") as unknown as Promise<Result<RequirementSummary[]>>,
    ]);

  const error = firstError([
    customers,
    oems,
    requirements,
    lineItems,
    reqOems,
    shipments,
    quoteLines,
    followUp,
  ]);
  if (error) return { data: null, error };

  return {
    data: {
      customers: customers.data ?? [],
      oems: oems.data ?? [],
      requirements: requirements.data ?? [],
      lineItems: lineItems.data ?? [],
      reqOems: reqOems.data ?? [],
      shipments: shipments.data ?? [],
      quoteLines: quoteLines.data ?? [],
      followUp: followUp.data ?? [],
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function createCustomer(
  supabase: SupabaseClient,
  input: { name: string; contact_name: string; email: string; phone: string; notes: string },
): Promise<string | null> {
  if (!input.name.trim()) return "Customer name is required.";
  const { error } = await supabase.from("customers").insert({
    name: input.name.trim(),
    contact_name: input.contact_name.trim() || null,
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    notes: input.notes.trim() || null,
  });
  return error?.message ?? null;
}

export async function updateCustomer(
  supabase: SupabaseClient,
  id: string,
  input: { name: string; contact_name: string; email: string; phone: string; notes: string },
): Promise<string | null> {
  if (!input.name.trim()) return "Customer name is required.";
  const { error } = await supabase
    .from("customers")
    .update({
      name: input.name.trim(),
      contact_name: input.contact_name.trim() || null,
      email: input.email.trim() || null,
      phone: input.phone.trim() || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", id);
  return error?.message ?? null;
}

export async function deleteCustomer(
  supabase: SupabaseClient,
  id: string,
): Promise<string | null> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return "This customer still has requirements. Delete or reassign them first.";
    }
    return error.message;
  }
  return null;
}

// ---------------------------------------------------------------------------
// OEMs
// ---------------------------------------------------------------------------

export async function createOem(
  supabase: SupabaseClient,
  input: { name: string; contact_name: string; email: string; phone: string; notes: string },
): Promise<string | null> {
  if (!input.name.trim()) return "OEM name is required.";
  const { error } = await supabase.from("oems").insert({
    name: input.name.trim(),
    contact_name: input.contact_name.trim() || null,
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    notes: input.notes.trim() || null,
  });
  if (error?.code === "23505") return "An OEM with that name already exists.";
  return error?.message ?? null;
}

export async function updateOem(
  supabase: SupabaseClient,
  id: string,
  input: { name: string; contact_name: string; email: string; phone: string; notes: string },
): Promise<string | null> {
  if (!input.name.trim()) return "OEM name is required.";
  const { error } = await supabase
    .from("oems")
    .update({
      name: input.name.trim(),
      contact_name: input.contact_name.trim() || null,
      email: input.email.trim() || null,
      phone: input.phone.trim() || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", id);
  if (error?.code === "23505") return "An OEM with that name already exists.";
  return error?.message ?? null;
}

export async function deleteOem(
  supabase: SupabaseClient,
  id: string,
): Promise<string | null> {
  const { error } = await supabase.from("oems").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return "This OEM is still linked to a requirement. Unlink it first.";
    }
    return error.message;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Requirements and line items
// ---------------------------------------------------------------------------

export type NewLineItem = { item: string; quantity: number; unit_price_paise: number };

export async function createRequirement(
  supabase: SupabaseClient,
  input: {
    customer_id: string;
    title: string;
    stage: Stage;
    submission_deadline: string;
    follow_up_date: string | null;
    notes: string;
    lineItems: NewLineItem[];
  },
): Promise<string | null> {
  // Validate everything before writing anything (AGENTS.md §3).
  if (!input.customer_id) return "Choose a customer.";
  if (!input.title.trim()) return "Title is required.";
  if (!input.submission_deadline) return "Submission deadline is required.";
  if (input.lineItems.length === 0) return "Add at least one line item.";
  for (const li of input.lineItems) {
    if (!li.item.trim()) return "Every line item needs an item name.";
    if (!Number.isInteger(li.quantity) || li.quantity <= 0) {
      return "Every line item needs a quantity greater than zero.";
    }
    if (!Number.isInteger(li.unit_price_paise) || li.unit_price_paise < 0) {
      return "Every line item needs a valid, non-negative unit price.";
    }
  }

  const { data: inserted, error: reqError } = await supabase
    .from("requirements")
    .insert({
      customer_id: input.customer_id,
      title: input.title.trim(),
      stage: input.stage,
      submission_deadline: input.submission_deadline,
      follow_up_date: input.follow_up_date || null,
      notes: input.notes.trim() || null,
    })
    .select("id")
    .single();

  if (reqError || !inserted) return reqError?.message ?? "Could not create the requirement.";

  const requirementId = (inserted as { id: string }).id;

  const { error: liError } = await supabase.from("line_items").insert(
    input.lineItems.map((li) => ({
      requirement_id: requirementId,
      item: li.item.trim(),
      quantity: li.quantity,
      unit_price_paise: li.unit_price_paise,
    })),
  );

  if (liError) {
    // Roll back so an invalid line item saves nothing.
    await supabase.from("requirements").delete().eq("id", requirementId);
    return liError.message;
  }

  return null;
}

export async function updateRequirement(
  supabase: SupabaseClient,
  id: string,
  input: {
    customer_id: string;
    title: string;
    stage: Stage;
    submission_deadline: string;
    follow_up_date: string | null;
    notes: string;
  },
): Promise<string | null> {
  if (!input.customer_id) return "Choose a customer.";
  if (!input.title.trim()) return "Title is required.";
  if (!input.submission_deadline) return "Submission deadline is required.";
  const { error } = await supabase
    .from("requirements")
    .update({
      customer_id: input.customer_id,
      title: input.title.trim(),
      stage: input.stage,
      submission_deadline: input.submission_deadline,
      follow_up_date: input.follow_up_date || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", id);
  return error?.message ?? null;
}

export async function setStage(
  supabase: SupabaseClient,
  id: string,
  stage: Stage,
): Promise<string | null> {
  const { error } = await supabase.from("requirements").update({ stage }).eq("id", id);
  return error?.message ?? null;
}

export async function deleteRequirement(
  supabase: SupabaseClient,
  id: string,
): Promise<string | null> {
  const { error } = await supabase.from("requirements").delete().eq("id", id);
  return error?.message ?? null;
}

export async function addLineItem(
  supabase: SupabaseClient,
  requirement_id: string,
  input: NewLineItem,
): Promise<string | null> {
  if (!input.item.trim()) return "Item name is required.";
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return "Quantity must be greater than zero.";
  }
  if (!Number.isInteger(input.unit_price_paise) || input.unit_price_paise < 0) {
    return "Unit price must be a valid, non-negative amount.";
  }
  const { error } = await supabase.from("line_items").insert({
    requirement_id,
    item: input.item.trim(),
    quantity: input.quantity,
    unit_price_paise: input.unit_price_paise,
  });
  return error?.message ?? null;
}

export async function deleteLineItem(
  supabase: SupabaseClient,
  id: string,
): Promise<string | null> {
  const { error } = await supabase.from("line_items").delete().eq("id", id);
  return error?.message ?? null;
}

// ---------------------------------------------------------------------------
// OEM links and shipments
// ---------------------------------------------------------------------------

export async function linkOem(
  supabase: SupabaseClient,
  requirement_id: string,
  oem_id: string,
): Promise<string | null> {
  if (!oem_id) return "Choose an OEM.";
  const { error } = await supabase
    .from("requirement_oems")
    .insert({ requirement_id, oem_id });
  if (error?.code === "23505") return "That OEM is already linked to this requirement.";
  return error?.message ?? null;
}

export async function unlinkOem(
  supabase: SupabaseClient,
  requirement_oem_id: string,
): Promise<string | null> {
  const { error } = await supabase
    .from("requirement_oems")
    .delete()
    .eq("id", requirement_oem_id);
  return error?.message ?? null;
}

export async function addShipment(
  supabase: SupabaseClient,
  requirement_oem_id: string,
  input: { quantity: number; expected_shipment_date: string },
): Promise<string | null> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return "Shipment quantity must be greater than zero.";
  }
  if (!input.expected_shipment_date) return "Expected shipment date is required.";
  const { error } = await supabase.from("oem_shipments").insert({
    requirement_oem_id,
    quantity: input.quantity,
    expected_shipment_date: input.expected_shipment_date,
  });
  return error?.message ?? null;
}

export async function deleteShipment(
  supabase: SupabaseClient,
  id: string,
): Promise<string | null> {
  const { error } = await supabase.from("oem_shipments").delete().eq("id", id);
  return error?.message ?? null;
}
