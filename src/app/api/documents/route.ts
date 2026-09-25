import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

import {
  generateDocumentNumber,
} from "@/lib/document-number";

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
  const cleaned =
    String(
      value ?? ""
    ).trim();

  return cleaned ||
    null;
}

function cleanUppercase(
  value: unknown
) {
  const cleaned =
    String(
      value ?? ""
    )
      .trim()
      .toUpperCase();

  return cleaned ||
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

function normalizeGstType(
  value:
    | string
    | null
    | undefined
): GstType {
  return value ===
    "IGST"
    ? "IGST"
    : "CGST_SGST";
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
    | string
    | null
    | undefined;
}): GstType {
  const normalizedCustomerState =
    normalizeState(
      customerState
    );

  const normalizedCompanyState =
    normalizeState(
      companyState
    );

  if (
    normalizedCustomerState &&
    normalizedCompanyState
  ) {
    return normalizedCustomerState ===
      normalizedCompanyState
      ? "CGST_SGST"
      : "IGST";
  }

  return normalizeGstType(
    fallback
  );
}

/* =========================================================
   CUSTOMER RESOLUTION
========================================================= */

async function resolveCustomer({
  nameFirmName,
  email,
  phone,
  whatsapp,
  gstNumber,
  city,
  state,
  addressLine1,
  addressLine2,
  addressLine3,
}: {
  nameFirmName: string;

  email:
    | string
    | null;

  phone:
    | string
    | null;

  whatsapp:
    | string
    | null;

  gstNumber:
    | string
    | null;

  city:
    | string
    | null;

  state:
    | string
    | null;

  addressLine1:
    | string
    | null;

  addressLine2:
    | string
    | null;

  addressLine3:
    | string
    | null;
}) {
  let existingCustomer =
    null;

  /*
   * Prefer GST as strongest identity.
   */

  if (
    gstNumber
  ) {
    existingCustomer =
      await prisma.customer.findFirst({
        where: {
          gstNumber,
        },
      });
  }

  /*
   * Then Email
   */

  if (
    !existingCustomer &&
    email
  ) {
    existingCustomer =
      await prisma.customer.findFirst({
        where: {
          email,
        },
      });
  }

  /*
   * Then Phone
   */

  if (
    !existingCustomer &&
    phone
  ) {
    existingCustomer =
      await prisma.customer.findFirst({
        where: {
          phone,
        },
      });
  }

  /*
   * Existing Customer
   */

  if (
    existingCustomer
  ) {
    return prisma.customer.update({
      where: {
        id:
          existingCustomer.id,
      },

      data: {
        nameFirmName,

        email:
          email ??
          existingCustomer.email,

        phone:
          phone ??
          existingCustomer.phone,

        whatsapp:
          whatsapp ??
          existingCustomer.whatsapp,

        gstNumber:
          gstNumber ??
          existingCustomer.gstNumber,

        city:
          city ??
          existingCustomer.city,

        state:
          state ??
          existingCustomer.state,

        addressLine1:
          addressLine1 ??
          existingCustomer.addressLine1,

        addressLine2:
          addressLine2 ??
          existingCustomer.addressLine2,

        addressLine3:
          addressLine3 ??
          existingCustomer.addressLine3,
      },
    });
  }

  /*
   * New Customer
   */

  return prisma.customer.create({
    data: {
      nameFirmName,

      email,

      phone,

      whatsapp,

      gstNumber,

      city,

      state,

      addressLine1,

      addressLine2,

      addressLine3,
    },
  });
}

/* =========================================================
   CREATE DOCUMENT
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    /* =====================================================
       AUTH
    ===================================================== */

    const session =
      await getSession();

    if (
      !session
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Unauthorized.",
        },
        {
          status:
            401,
        }
      );
    }

    const body =
      await request.json();

    const settings =
      await getSettings();

    /* =====================================================
       DOCUMENT TYPE / SAVE MODE
    ===================================================== */

    const saveAsDraft =
      body.saveAsDraft ===
      true;

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

    const primaryEmail =
      toEmails[0] ??
      null;

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

    const customerAddressLine1 =
      cleanString(
        customer.addressLine1
      );

    const customerAddressLine2 =
      cleanString(
        customer.addressLine2
      );

    const customerAddressLine3 =
      cleanString(
        customer.addressLine3
      );

    /*
     * State is mandatory because it is now
     * part of the document reference number.
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
       PRODUCTS
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

    /*
     * Variants are intentionally not used.
     */

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
            "One or more selected products are invalid or inactive.",
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

          const priceOverride =
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
            priceOverride !==
              null &&
            (
              !Number.isFinite(
                priceOverride
              ) ||
              priceOverride <
                0
            )
          ) {
            throw new Error(
              `Invalid price override for ${product.name}.`
            );
          }

          const finalPrice =
            priceOverride !==
            null
              ? priceOverride
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
              `Quantity must be at least 1 for ${product.name}.`
            );
          }

          return {
            productId:
              product.id,

            /*
             * DB compatibility only.
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

            priceOverride,

            finalPrice,

            quantity,

            lineTotal:
              finalPrice *
              quantity,
          };
        }
      );

    /* =====================================================
       SUBTOTAL
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

       GST percentage is always taken
       from Admin Settings.
    ===================================================== */

    const gstPercent =
      Number(
        settings.gst ??
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
       CUSTOMER MASTER
    ===================================================== */

    const masterCustomer =
      await resolveCustomer({
        nameFirmName,

        email:
          primaryEmail,

        phone:
          customerPhone,

        whatsapp:
          customerWhatsapp,

        gstNumber:
          customerGST,

        city:
          customerCity,

        state:
          customerState,

        addressLine1:
          customerAddressLine1,

        addressLine2:
          customerAddressLine2,

        addressLine3:
          customerAddressLine3,
      });

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

    const status =
      saveAsDraft
        ? "DRAFT"
        : "PREVIEWED";

    /* =====================================================
       CREATE DOCUMENT
    ===================================================== */

    const document =
      await prisma.document.create({
        data: {
          documentNumber,

          documentType,

          status,

          /*
           * Person issuing the document.
           */
          issuerInitials,

          /* ---------------------------------------------
             CUSTOMER
          --------------------------------------------- */

          customerId:
            masterCustomer.id,

          customerNameFirm:
            nameFirmName,

          customerPhone,

          customerWhatsapp,

          customerGST,

          customerCity,

          customerState,

          addressLine1:
            customerAddressLine1,

          addressLine2:
            customerAddressLine2,

          addressLine3:
            customerAddressLine3,

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
             DOCUMENT SNAPSHOTS
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

          /*
           * Bank details only belong
           * to Order Forms.
           */
          bankDetailsSnapshot:
            documentType ===
            "ORDER_FORM"
              ? settings.bankDetails ||
                null
              : null,

          signatureImageSnapshot:
            settings.signatureImage ||
            null,

          /* ---------------------------------------------
             CREATED BY
          --------------------------------------------- */

          createdById:
            session.userId,

          /* ---------------------------------------------
             ITEMS
          --------------------------------------------- */

          items: {
            create:
              preparedItems,
          },

          /* ---------------------------------------------
             EMAIL RECIPIENTS
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
                saveAsDraft
                  ? "DOCUMENT_DRAFT_SAVED"
                  : "DOCUMENT_CREATED",

              description:
                saveAsDraft
                  ? `Draft saved by ${session.name}. Customer linked to ${masterCustomer.nameFirmName}. Reference: ${documentNumber}. GST type: ${gstType}.`
                  : `Document created by ${session.name}. Customer linked to ${masterCustomer.nameFirmName}. Reference: ${documentNumber}. GST type: ${gstType}.`,
            },
          },
        },

        select: {
          id:
            true,

          documentNumber:
            true,

          documentType:
            true,

          issuerInitials:
            true,

          status:
            true,

          customerId:
            true,

          customerState:
            true,

          gstType:
            true,

          gstPercent:
            true,

          cgstPercent:
            true,

          cgstAmount:
            true,

          sgstPercent:
            true,

          sgstAmount:
            true,

          igstPercent:
            true,

          igstAmount:
            true,

          gstAmount:
            true,

          grandTotal:
            true,
        },
      });

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success:
          true,

        message:
          saveAsDraft
            ? "Draft saved successfully."
            : "Document created successfully.",

        data:
          document,
      },
      {
        status:
          201,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "CREATE DOCUMENT ERROR:",
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
            : "Unable to create document.",
      },
      {
        status:
          500,
      }
    );
  }
}