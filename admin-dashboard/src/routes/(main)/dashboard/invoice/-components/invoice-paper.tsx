import { formatMoneyRs } from "@/lib/mplads-mock";
import { formatCurrency } from "@/lib/utils";

import {
  getLineAmount,
  getUCSubtotal,
  getUCTotal,
  getUCTranches,
  INVOICE_PAPER_HEIGHT,
  INVOICE_PAPER_WIDTH,
  type UCFormValues,
  ucWorks,
} from "./data";

export function InvoicePaper({ invoice }: { invoice: UCFormValues }) {
  const work = ucWorks.find((option) => option.id === invoice.workId) ?? ucWorks[0];

  return (
    <article
      style={{ width: INVOICE_PAPER_WIDTH, height: INVOICE_PAPER_HEIGHT }}
      data-print-paper
      className="relative flex flex-col gap-24 bg-neutral-50 px-12.25 py-11 font-mono text-neutral-950"
    >
      <header className="flex flex-col gap-10">
        <div className="grid grid-cols-2 items-start gap-14">
          <svg className="size-12" viewBox="0 0 48 48" aria-hidden="true">
            <rect width="20" height="20" rx="3" fill="currentColor" />
            <rect x="28" width="20" height="20" rx="3" fill="currentColor" />
            <rect y="28" width="20" height="20" rx="3" fill="currentColor" />
            <rect x="28" y="28" width="20" height="20" rx="3" fill="currentColor" />
          </svg>
          <h2 className="text-4xl uppercase tracking-widest">Utilisation Certificate</h2>
        </div>

        <section className="grid grid-cols-2 gap-14 text-sm leading-relaxed">
          <div>
            <p>Reference: {invoice.referenceNumber}</p>
            <p>Sanctioned: {invoice.issuedDate}</p>
            <p>Due: {invoice.paymentDueDate}</p>
          </div>
          <div>
            <p>UC status</p>
            <p>{invoice.status === "pending" ? "PENDING" : "RECEIVED"}</p>
            <p>Work {work.id}</p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-14 text-sm leading-relaxed">
          <div>
            <p className="mb-4 font-semibold uppercase">Work</p>
            <p>
              {work.id} — {work.title}
            </p>
            <p>
              {work.district}, {work.state}
            </p>
            <p>Status: {work.status}</p>
          </div>
          <div>
            <p className="mb-4 font-semibold uppercase">Agency</p>
            <p>{work.agency}</p>
            <p>Sanctioned {formatMoneyRs(work.sanctionedRs)}</p>
            <p>Expenditure {formatMoneyRs(work.expenditureRs)}</p>
          </div>
        </section>
      </header>

      <div className="flex flex-col gap-5">
        <section className="text-sm">
          <div className="grid grid-cols-[1fr_74px_116px_116px] bg-stone-200 px-3 py-3 font-semibold uppercase">
            <span>Description</span>
            <span className="text-right">Units</span>
            <span className="text-right">Unit cost</span>
            <span className="text-right">Line total</span>
          </div>
          {getUCTranches(invoice).map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_74px_116px_116px] border-[oklch(0.86_0_0)] border-b px-3 py-4"
            >
              <span>{item.description}</span>
              <span className="text-right">{item.quantity}</span>
              <span className="text-right">{formatInvoiceCurrency(item.unitPrice)}</span>
              <span className="text-right">{formatInvoiceCurrency(getLineAmount(item))}</span>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-2 gap-14 text-sm leading-relaxed">
          <section className="col-start-2 space-y-2">
            <div>
              <div className="flex justify-between gap-8">
                <span>Sanctioned total</span>
                <span>{formatInvoiceCurrency(getUCSubtotal(invoice))}</span>
              </div>
            </div>
            <div className="border-current border-y-2 py-3">
              <div className="flex justify-between gap-8">
                <span className="font-semibold uppercase">Total accounted</span>
                <span className="font-semibold">{formatInvoiceCurrency(getUCTotal(invoice))}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="absolute right-12.25 bottom-11 left-12.25 grid grid-cols-2 gap-14 text-neutral-500 text-sm leading-relaxed">
        <div>
          <p>
            {work.district}, {work.state}
          </p>
          <p>Agency: {work.agency}</p>
          <p>Reference {invoice.referenceNumber}</p>
        </div>
        <div>
          <p>Prepared for prompt processing.</p>
          <p>UC {invoice.status === "pending" ? "pending for last tranche" : "received (demo)"}</p>
        </div>
      </footer>
    </article>
  );
}

function formatInvoiceCurrency(value: number) {
  return formatCurrency(Number.isFinite(value) ? value : 0, {
    currency: "INR",
    locale: "en-IN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
