import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import DocumentForm from "@/components/documents/document-form";

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const dynamic =
  "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PublicEditDocumentPage({
  params,
}: Props) {
  const { id } =
    await params;

  const documentId =
    Number(id);

  if (
    !Number.isInteger(
      documentId
    ) ||
    documentId <= 0
  ) {
    notFound();
  }

  const [
    document,
    categories,
    products,
    customers,
    settings,
  ] = await Promise.all([
    prisma.document.findUnique({
      where: {
        id:
          documentId,
      },

      include: {
        items:
          true,

        recipients:
          true,
      },
    }),

    prisma.category.findMany({
      where: {
        isActive:
          true,
      },

      select: {
        id:
          true,

        name:
          true,
      },

      orderBy: {
        name:
          "asc",
      },
    }),

    prisma.product.findMany({
      where: {
        isActive:
          true,
      },

      select: {
        id:
          true,

        name:
          true,

        model:
          true,

        description:
          true,

        categoryId:
          true,

        standardPrice:
          true,
      },

      orderBy: {
        name:
          "asc",
      },
    }),

    prisma.customer.findMany({
      select: {
        id:
          true,

        nameFirmName:
          true,

        email:
          true,

        phone:
          true,

        whatsapp:
          true,

        gstNumber:
          true,

        city:
          true,

        state:
          true,

        addressLine1:
          true,

        addressLine2:
          true,

        addressLine3:
          true,
      },

      orderBy: {
        nameFirmName:
          "asc",
      },
    }),

    getSettings(),
  ]);

  if (!document) {
    notFound();
  }

  if (
    document.documentType !==
      "QUOTATION" &&
    document.documentType !==
      "ORDER_FORM"
  ) {
    notFound();
  }

  if (
    document.status !==
      "PREVIEWED"
  ) {
    redirect(
      `/quotation/${document.id}/preview`
    );
  }

  const toEmails =
    document.recipients
      .filter(
        (
          recipient
        ) =>
          recipient.type ===
          "TO"
      )
      .map(
        (
          recipient
        ) =>
          recipient.email
      )
      .join(
        ", "
      );

  const ccEmails =
    document.recipients
      .filter(
        (
          recipient
        ) =>
          recipient.type ===
          "CC"
      )
      .map(
        (
          recipient
        ) =>
          recipient.email
      )
      .join(
        ", "
      );

  const productMap =
    new Map(
      products.map(
        (
          product
        ) => [
          product.id,
          product,
        ]
      )
    );

  const documentLabel =
    document.documentType ===
    "ORDER_FORM"
      ? "Order Form"
      : "Quotation";

  return (
    <main className="min-h-screen bg-slate-100">
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

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Edit {documentLabel}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Update {document.documentNumber}. The existing serial number will be retained.
          </p>
        </div>

        <DocumentForm
          publicMode
          submitEndpoint="/api/public/quotation"
          previewBasePath="/quotation"

          categories={
            categories
          }

          customers={
            customers
          }

          companyState={
            settings.companyState
          }

          defaultGstPercent={
            settings.gst
          }

          defaultGstType={
            settings.gstType
          }

          products={products.map(
            (
              product
            ) => ({
              id:
                product.id,

              name:
                product.name,

              model:
                product.model,

              description:
                product.description,

              categoryId:
                product.categoryId,

              standardPrice:
                product.standardPrice.toString(),
            })
          )}

          document={{
            id:
              document.id,

            documentType:
              document.documentType,

            issuerInitials:
              document.issuerInitials ??
              "",

            customer: {
              nameFirmName:
                document.customerNameFirm,

              email:
                toEmails,

              cc:
                ccEmails,

              phone:
                document.customerPhone ??
                "",

              whatsapp:
                document.customerWhatsapp ??
                "",

              gstNumber:
                document.customerGST ??
                "",

              city:
                document.customerCity ??
                "",

              state:
                document.customerState ??
                "",

              addressLine1:
                document.addressLine1 ??
                "",

              addressLine2:
                document.addressLine2 ??
                "",

              addressLine3:
                document.addressLine3 ??
                "",
            },

            gstType:
              document.gstType,

            gstPercent:
              document.gstPercent.toString(),

            additionalNotes:
              document.additionalNotes ??
              "",

            items:
              document.items.map(
                (
                  item
                ) => {
                  const product =
                    item.productId
                      ? productMap.get(
                          item.productId
                        )
                      : undefined;

                  return {
                    productId:
                      item.productId ??
                      0,

                    categoryId:
                      product?.categoryId ??
                      0,

                    standardPrice:
                      item.standardPrice.toString(),

                    priceOverride:
                      item.priceOverride?.toString() ??
                      "",

                    quantity:
                      item.quantity,
                  };
                }
              ),
          }}
        />
      </div>
    </main>
  );
}
