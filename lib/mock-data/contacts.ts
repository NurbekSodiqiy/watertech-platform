export interface Contact {
  id: string;
  name: string;
  role: string;
  topic: string;
  phone: string;
  messenger: string;
}

export const contacts: Contact[] = [
  { id: "c-1", name: "[Name Placeholder]", role: "Head of Sales", topic: "Escalations, discount approval", phone: "+1 (000) 000-0000", messenger: "@placeholder" },
  { id: "c-2", name: "[Name Placeholder]", role: "Logistics Coordinator", topic: "Delivery & stock questions", phone: "+1 (000) 000-0001", messenger: "@placeholder" },
  { id: "c-3", name: "[Name Placeholder]", role: "Technical Support Lead", topic: "Product specs, warranty claims", phone: "+1 (000) 000-0002", messenger: "@placeholder" },
  { id: "c-4", name: "[Name Placeholder]", role: "Finance", topic: "Invoices, payment terms", phone: "+1 (000) 000-0003", messenger: "@placeholder" },
  { id: "c-5", name: "[Name Placeholder]", role: "Sales Enablement", topic: "Training, KB content requests", phone: "+1 (000) 000-0004", messenger: "@placeholder" },
];
