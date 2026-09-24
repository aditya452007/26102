import { anomalies, FLAGSHIP_WORK_ID, works } from "@/lib/mplads-mock";
import type { Work } from "@/lib/mplads-schema";

export interface UCTranche {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export type UCStatus = "pending" | "received";

export const INVOICE_PAPER_WIDTH = 816;
export const INVOICE_PAPER_HEIGHT = 1056;
export const INVOICE_PAPER_SCALE = 0.6;

export interface UCWorkOption {
  id: string;
  title: string;
  district: string;
  state: string;
  agency: string;
  sanctionedRs: number;
  expenditureRs: number;
  sanctionDate: string;
  dueDate: string;
  status: Work["status"];
  ucStatus: UCStatus;
}

export interface UCFormValues {
  workId: string;
  referenceNumber: string;
  issuedDate: string;
  paymentDueDate: string;
  status: UCStatus;
  items: UCTranche[];
}

const utilisationWorkIds = new Set(
  anomalies.filter((anomaly) => anomaly.kind === "utilisation").map((anomaly) => anomaly.workId),
);

function ucStatusFor(workId: string): UCStatus {
  return utilisationWorkIds.has(workId) ? "pending" : "received";
}

export const ucWorks: UCWorkOption[] = works
  .map((work) => ({
    id: work.id,
    title: work.title,
    district: work.district,
    state: work.state,
    agency: work.agency,
    sanctionedRs: work.sanctionedRs,
    expenditureRs: work.expenditureRs,
    sanctionDate: work.sanctionDate,
    dueDate: work.dueDate,
    status: work.status,
    ucStatus: ucStatusFor(work.id),
  }))
  .sort((a, b) => {
    if (a.ucStatus !== b.ucStatus) {
      return a.ucStatus === "pending" ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  });

function tranchesFor(work: UCWorkOption): UCTranche[] {
  const released = Math.round(work.expenditureRs);
  const balance = Math.round(Math.max(work.sanctionedRs - work.expenditureRs, 0));
  return [
    {
      id: `${work.id}-released`,
      description: "Funds released to agency",
      quantity: 1,
      unitPrice: released,
    },
    {
      id: `${work.id}-balance`,
      description: "Balance sanctioned (unreleased)",
      quantity: 1,
      unitPrice: balance,
    },
  ];
}

export function valuesForWork(workId: string): UCFormValues {
  const work = ucWorks.find((option) => option.id === workId) ?? ucWorks[0];
  return {
    workId: work.id,
    referenceNumber: `UC-${work.id}`,
    issuedDate: work.sanctionDate,
    paymentDueDate: work.dueDate,
    status: work.ucStatus,
    items: tranchesFor(work),
  };
}

function defaultWork(): UCWorkOption {
  return (
    ucWorks.find((work) => work.ucStatus === "pending") ??
    ucWorks.find((work) => work.id === FLAGSHIP_WORK_ID) ??
    ucWorks[0]
  );
}

export const defaultUCValues: UCFormValues = valuesForWork(defaultWork().id);

export function getLineAmount(item?: UCTranche) {
  if (!item) return 0;

  const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
  const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;

  return quantity * unitPrice;
}

export function getUCTranches(uc: UCFormValues) {
  return uc.items;
}

export function getUCSubtotal(uc: UCFormValues) {
  return getUCTranches(uc).reduce((subtotal, item) => subtotal + getLineAmount(item), 0);
}

export function getUCTotal(uc: UCFormValues) {
  return getUCSubtotal(uc);
}
