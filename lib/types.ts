export type Stage = "New" | "Quoting" | "Submitted" | "Won" | "Lost";

export const STAGES: Stage[] = ["New", "Quoting", "Submitted", "Won", "Lost"];

export const OPEN_STAGES: Stage[] = ["New", "Quoting", "Submitted"];

export type Customer = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RequirementSummary = {
  id: string;
  customer_id: string;
  title: string;
  stage: Stage;
  submission_deadline: string;
  follow_up_date: string | null;
  notes: string | null;
  government_quantity: number;
  government_value_paise: number;
  committed_quantity: number;
  uncovered_quantity: number;
};

export type LineItem = {
  id: string;
  requirement_id: string;
  item: string;
  quantity: number;
  unit_price_paise: number;
  created_at: string;
};

export type Oem = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RequirementOem = {
  id: string;
  requirement_id: string;
  oem_id: string;
  notes: string | null;
  created_at: string;
};

export type OemShipment = {
  id: string;
  requirement_oem_id: string;
  quantity: number;
  expected_shipment_date: string;
  created_at: string;
};

export type QuoteLine = {
  customer_id: string;
  requirement_id: string;
  title: string;
  stage: Stage;
  submission_deadline: string;
  line_item_id: string;
  item: string;
  quantity: number;
  unit_price_paise: number;
  line_value_paise: number;
};
