import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import PublicQuotationPreviewActions from "@/components/documents/public-quotation-preview-actions";

type PreviewPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    editToken?: string;
  }>;
};

export const dynamic =
  "force-dynamic";

export default async function PublicDocumentPreviewPage({
  params,
  searchParams,
}: PreviewPageProps) {
  const { id } =
    await params;

  const { editToken = "" } =
    await searchParams;

  const documentId =
    Number(id);

  if (
    !Number.isInteger(
      documentId
    )
  ) {
    notFound();
  }

  const document =
    await prisma.document.findUnique({
      where: {
        id:
          documentId,
      },

      include: {
        recipients:
          true,
      },
    });

  if (!document) {
    notFound();
  }

  /*
   * Only public quotation/order-form documents
   * are supported by this workflow.
   */
  if (
    document.documentType !==
      "QUOTATION" &&
    document.documentType !==
      "ORDER_FORM"
  ) {
    notFound();
  }

  const documentLabel =
    document.documentType ===
    "ORDER_FORM"
      ? "Order Form"
      : "Quotation";

  const toRecipients =
    document.recipients.filter(
      (
        recipient
      ) =>
        recipient.type ===
        "TO"
    );

  const ccRecipients =
    document.recipients.filter(
      (
        recipient
      ) =>
        recipient.type ===
        "CC"
    );

  return (
    <main className="min-h-screen bg-slate-100">
      {/* =====================================
          HEADER
      ===================================== */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <div>
            <div className="text-xl font-bold text-slate-950">
              SDP Machines
            </div>

            <div className="mt-0.5 text-xs uppercase tracking-[0.18em] text-slate-400">
              Document Generator
            </div>
          </div>

          <Link
            href="/quotation"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Create New Document
          </Link>
        </div>
      </header>

      {/* =====================================
          CONTENT
      ===================================== */}

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={
                editToken
                  ? `/quotation/${document.id}/edit?editToken=${encodeURIComponent(editToken)}`
                  : `/quotation/${document.id}/edit`
              }
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
            >
              <ArrowLeft size={17} />
              Go Back
            </Link>

            <h1 className="text-2xl font-bold text-slate-900">
              {documentLabel} Preview
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review the complete {documentLabel.toLowerCase()} before approval.
            </p>
          </div>

          <PublicQuotationPreviewActions
            documentId={
              document.id
            }

            currentStatus={
              document.status
            }

            documentType={
              document.documentType
            }
          />
        </div>

        {/* =====================================
            STATUS
        ===================================== */}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {
                document.documentNumber
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {documentLabel} · Customer:{" "}
              {
                document.customerNameFirm
              }
            </p>
          </div>

          <StatusBadge
            status={
              document.status
            }
          />
        </div>

        {/* =====================================
            PDF
        ===================================== */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
          <iframe
            src={`/api/public/quotation/${document.id}/preview-pdf`}
            title={`Preview ${document.documentNumber}`}
            className="h-[calc(100vh-220px)] min-h-[700px] w-full bg-slate-200"
          />
        </div>

        {/* =====================================
            EMAIL RECIPIENTS
        ===================================== */}

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">
            Email Recipients
          </h2>

          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                To
              </p>

              <div className="mt-2 space-y-1">
                {toRecipients.length ===
                0 ? (
                  <p className="text-sm text-slate-400">
                    No recipient specified.
                  </p>
                ) : (
                  toRecipients.map(
                    (
                      recipient
                    ) => (
                      <p
                        key={
                          recipient.id
                        }
                        className="text-sm text-slate-700"
                      >
                        {
                          recipient.email
                        }
                      </p>
                    )
                  )
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                CC
              </p>

              <div className="mt-2 space-y-1">
                {ccRecipients.length ===
                0 ? (
                  <p className="text-sm text-slate-400">
                    No CC recipients.
                  </p>
                ) : (
                  ccRecipients.map(
                    (
                      recipient
                    ) => (
                      <p
                        key={
                          recipient.id
                        }
                        className="text-sm text-slate-700"
                      >
                        {
                          recipient.email
                        }
                      </p>
                    )
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status:
    string;
}) {
  let classes =
    "bg-slate-100 text-slate-700";

  if (
    status ===
    "PREVIEWED"
  ) {
    classes =
      "bg-amber-100 text-amber-700";
  }

  if (
    status ===
    "APPROVED"
  ) {
    classes =
      "bg-emerald-100 text-emerald-700";
  }

  if (
    status ===
    "SENT"
  ) {
    classes =
      "bg-blue-100 text-blue-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${classes}`}
    >
      {status}
    </span>
  );
}