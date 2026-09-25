import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

import {
  generateDocumentNumber,
} from "@/lib/document-number";

import {
  generateDocumentPdf,
} from "@/lib/generate-document-pdf";

type GstType =
  | "CGST_SGST"
  | "IGST";

/* =========================================================
   HELPERS
========================================================= */

function parseEmails(
  value: string
) {
  return value
    .split(/[;,]/)
    .map(
      (
        email
      ) =>
        email
          .trim()
          .toLowerCase()
    )
    .filter(
      Boolean
    );
}

function cleanString(
  value: unknown
) {
  const result =
    String(
      value ?? ""
    ).trim();

  return result ||
    null;
}

function cleanUppercase(
  value: unknown
) {
  const result =
    String(
      value ?? ""
    )
      .trim()
      .toUpperCase();

  return result ||
    null;
}

function cleanIssuerInitials(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .trim()
    .toUpperCase()
    .replace(
      /[^A-Z]/g,
      ""
    )
    .slice(
      0,
      4
    );
}

/* =========================================================
   GST HELPERS
========================================================= */

function normalizeState(
  value:
    | string
    | null
    | undefined
) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    );
}

function determineGstType({
  customerState,
  companyState,
  fallback,
}: {
  customerState:
    | string
    | null
    | undefined;

  companyState:
    | string
    | null
    | undefined;

  fallback:
    string;
}): GstType {
  const customer =
    normalizeState(
      customerState
    );

  const company =
    normalizeState(
      companyState
    );

  if (
    customer &&
    company
  ) {
    return customer ===
      company
      ? "CGST_SGST"
      : "IGST";
  }

  return fallback ===
    "IGST"
    ? "IGST"
    : "CGST_SGST";
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const settings =
      await getSettings();

      const documentType =
  body.documentType ===
  "ORDER_FORM"
    ? "ORDER_FORM"
    : "QUOTATION";

    /* =====================================================
       ISSUER INITIALS
    ===================================================== */

    const issuerInitials =
      cleanIssuerInitials(
        body.issuerInitials
      );

    if (
      !issuerInitials
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Issuer initials are required.",
        },
        {
          status:
            422,
        }
      );
    }

    /* =====================================================
       CUSTOMER
    ===================================================== */

    const customer =
      body.customer ??
      {};

    const nameFirmName =
      String(
        customer.nameFirmName ??
          ""
      ).trim();

    if (
      !nameFirmName
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Name / Firm Name is required.",
        },
        {
          status:
            422,
        }
      );
    }

    const toEmails =
      parseEmails(
        String(
          customer.email ??
            ""
        )
      );

    const ccEmails =
      parseEmails(
        String(
          customer.cc ??
            ""
        )
      );

    const customerPhone =
      cleanString(
        customer.phone
      );

    const customerWhatsapp =
      cleanString(
        customer.whatsapp
      );

    const customerGST =
      cleanUppercase(
        customer.gstNumber
      );

    const customerCity =
      cleanString(
        customer.city
      );

    const customerState =
      cleanString(
        customer.state
      );

    const addressLine1 =
      cleanString(
        customer.addressLine1
      );

    const addressLine2 =
      cleanString(
        customer.addressLine2
      );

    const addressLine3 =
      cleanString(
        customer.addressLine3
      );

    /*
     * State is now mandatory because it is
     * part of the reference number.
     */

    if (
      !customerState
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Customer state is required.",
        },
        {
          status:
            422,
        }
      );
    }

    /* =====================================================
       ITEMS
    ===================================================== */

    if (
      !Array.isArray(
        body.items
      ) ||
      body.items.length ===
        0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "At least one product is required.",
        },
        {
          status:
            422,
        }
      );
    }

    const productIds =
      body.items.map(
        (
          item: {
            productId:
              number;
          }
        ) =>
          Number(
            item.productId
          )
      );

    if (
      productIds.some(
        (
          productId:
            number
        ) =>
          !Number.isInteger(
            productId
          ) ||
          productId <=
            0
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "One or more selected products are invalid.",
        },
        {
          status:
            422,
        }
      );
    }

    const products =
      await prisma.product.findMany({
        where: {
          id: {
            in:
              productIds,
          },

          isActive:
            true,
        },

        include: {
          category:
            true,
        },
      });

    if (
      products.length !==
      new Set(
        productIds
      ).size
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "One or more selected products are invalid.",
        },
        {
          status:
            422,
        }
      );
    }

    /* =====================================================
       PREPARE ITEMS
    ===================================================== */

    const preparedItems =
      body.items.map(
        (
          item: {
            productId:
              number;

            quantity:
              number;

            priceOverride:
              | number
              | string
              | null;
          }
        ) => {
          const product =
            products.find(
              (
                product
              ) =>
                product.id ===
                Number(
                  item.productId
                )
            );

          if (
            !product
          ) {
            throw new Error(
              "Product not found."
            );
          }

          const standardPrice =
            Number(
              product.standardPrice
            );

          if (
            !Number.isFinite(
              standardPrice
            ) ||
            standardPrice <
              0
          ) {
            throw new Error(
              `Invalid standard price for ${product.name}.`
            );
          }

          const override =
            item.priceOverride ===
              null ||
            item.priceOverride ===
              undefined ||
            String(
              item.priceOverride
            ).trim() ===
              ""
              ? null
              : Number(
                  item.priceOverride
                );

          if (
            override !==
              null &&
            (
              !Number.isFinite(
                override
              ) ||
              override <
                0
            )
          ) {
            throw new Error(
              `Invalid price override for ${product.name}.`
            );
          }

          const finalPrice =
            override !==
            null
              ? override
              : standardPrice;

          const quantity =
            Number(
              item.quantity
            );

          if (
            !Number.isInteger(
              quantity
            ) ||
            quantity <
              1
          ) {
            throw new Error(
              `Invalid quantity for ${product.name}.`
            );
          }

          return {
            productId:
              product.id,

            /*
             * Variants are intentionally not used.
             */
            variantId:
              null,

            variantName:
              null,

            productName:
              product.name,

            productModel:
              product.model,

            productDescription:
              product.description,

            categoryName:
              product.category.name,

            annexureSnapshot:
              product.annexureContent ??
              null,

            standardPrice,

            priceOverride:
              override,

            finalPrice,

            quantity,

            lineTotal:
              finalPrice *
              quantity,
          };
        }
      );

    /* =====================================================
       TOTALS
    ===================================================== */

    const subtotal =
      preparedItems.reduce(
        (
          total:
            number,

          item: {
            lineTotal:
              number;
          }
        ) =>
          total +
          item.lineTotal,

        0
      );

    /* =====================================================
       GST
    ===================================================== */

    const gstPercent =
      Number(
        settings.gst ||
          18
      );

    if (
      !Number.isFinite(
        gstPercent
      ) ||
      gstPercent <
        0 ||
      gstPercent >
        100
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Invalid GST percentage configured in Settings.",
        },
        {
          status:
            500,
        }
      );
    }

    const gstType =
      determineGstType({
        customerState,

        companyState:
          settings.companyState,

        fallback:
          settings.gstType,
      });

    const cgstPercent =
      gstType ===
      "CGST_SGST"
        ? gstPercent /
          2
        : 0;

    const sgstPercent =
      gstType ===
      "CGST_SGST"
        ? gstPercent /
          2
        : 0;

    const igstPercent =
      gstType ===
      "IGST"
        ? gstPercent
        : 0;

    const cgstAmount =
      subtotal *
      (
        cgstPercent /
        100
      );

    const sgstAmount =
      subtotal *
      (
        sgstPercent /
        100
      );

    const igstAmount =
      subtotal *
      (
        igstPercent /
        100
      );

    const gstAmount =
      cgstAmount +
      sgstAmount +
      igstAmount;

    const grandTotal =
      subtotal +
      gstAmount;

    /* =====================================================
       CREATOR

       createdById is required in DB.
       For public quotations we attribute the document to
       the first active Admin account.
    ===================================================== */

    const systemOwner =
      await prisma.user.findFirst({
        where: {
          role:
            "ADMIN",

          isActive:
            true,
        },

        select: {
          id:
            true,
        },

        orderBy: {
          id:
            "asc",
        },
      });

    if (
      !systemOwner
    ) {
      throw new Error(
        "No active administrator account is configured."
      );
    }

    /* =====================================================
       DOCUMENT NUMBER

       Example:
       SDPM/RJ/26-27/PT/001
    ===================================================== */

    const documentNumber =
      await generateDocumentNumber({
        customerState,

        issuerInitials,

        documentType,

        startingSerial:
          documentType ===
          "ORDER_FORM"
            ? Number(
                settings.orderFormStartNumber
              )
            : Number(
                settings.quotationStartNumber
              ),
      });

    /* =====================================================
       CREATE DOCUMENT
    ===================================================== */

    const document =
      await prisma.document.create({
        data: {
          documentNumber,

          documentType,

          status:
            "PREVIEWED",

          issuerInitials,

          /* ---------------------------------------------
             CUSTOMER SNAPSHOT
          --------------------------------------------- */

          customerNameFirm:
            nameFirmName,

          customerPhone,

          customerWhatsapp,

          customerGST,

          customerCity,

          customerState,

          addressLine1,

          addressLine2,

          addressLine3,

          /* ---------------------------------------------
             TOTALS
          --------------------------------------------- */

          subtotal,

          gstType,

          gstPercent,

          cgstPercent,

          cgstAmount,

          sgstPercent,

          sgstAmount,

          igstPercent,

          igstAmount,

          gstAmount,

          grandTotal,

          additionalNotes:
            cleanString(
              body.additionalNotes
            ),

          /* ---------------------------------------------
             SNAPSHOTS
          --------------------------------------------- */

          headerBannerSnapshot:
            settings.headerBanner ||
            null,

          footerBannerSnapshot:
            settings.footerBanner ||
            null,

          termsSnapshot:
            settings.terms ||
            null,

          warrantySnapshot:
            settings.warranty ||
            null,

          quoteFooterSnapshot:
            settings.quoteFooter ||
            null,

          signatureImageSnapshot:
            settings.signatureImage ||
            null,

          /*
           * Public route only creates quotations,
           * therefore bank details are not required.
           */
          bankDetailsSnapshot:
  documentType ===
  "ORDER_FORM"
    ? settings.bankDetails ||
      null
    : null,

          createdById:
            systemOwner.id,

          /* ---------------------------------------------
             ITEMS
          --------------------------------------------- */

          items: {
            create:
              preparedItems,
          },

          /* ---------------------------------------------
             RECIPIENTS
          --------------------------------------------- */

          recipients: {
            create: [
              ...toEmails.map(
                (
                  email
                ) => ({
                  email,

                  type:
                    "TO" as const,
                })
              ),

              ...ccEmails.map(
                (
                  email
                ) => ({
                  email,

                  type:
                    "CC" as const,
                })
              ),
            ],
          },

          /* ---------------------------------------------
             ACTIVITY
          --------------------------------------------- */

          activities: {
  create: {
    action:
      documentType ===
      "ORDER_FORM"
        ? "PUBLIC_ORDER_FORM_CREATED"
        : "PUBLIC_QUOTATION_CREATED",

    description:
      `${
        documentType ===
        "ORDER_FORM"
          ? "Order Form"
          : "Quotation"
      } generated from public document page. Reference: ${documentNumber}. Issuer: ${issuerInitials}. State: ${customerState}. GST type: ${gstType}.`,
  },
},
        },

        select: {
          id:
            true,

          documentNumber:
            true,

          issuerInitials:
            true,

          customerState:
            true,

          status:
            true,
        },
      });

    /* =====================================================
       GENERATE PDF

       The public workflow already has dedicated preview,
       download and send routes, but keeping this response
       maintains compatibility with any existing frontend
       code expecting pdfBase64.
    ===================================================== */

    const {
      buffer,
      filename,
    } =
      await generateDocumentPdf(
        document.id
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success:
        true,

      message:
        "Quotation generated successfully.",

      data: {
        id:
          document.id,

        documentNumber:
          document.documentNumber,

        issuerInitials:
          document.issuerInitials,

        customerState:
          document.customerState,

        filename,

        pdfBase64:
          buffer.toString(
            "base64"
          ),
      },
    });
  } catch (
    error
  ) {
    console.error(
      "PUBLIC QUOTATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof
            Error
            ? error.message
            : "Unable to generate quotation.",
      },
      {
        status:
          500,
      }
    );
  }
}