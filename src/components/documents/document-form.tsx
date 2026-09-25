"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  INDIA_STATES,
} from "@/lib/india-states";

/* =========================================================
   TYPES
========================================================= */

type GstType =
  | "CGST_SGST"
  | "IGST";

type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  model: string | null;
  description: string | null;
  categoryId: number;
  standardPrice: string;
};

type CustomerOption = {
  id: number;
  nameFirmName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  gstNumber: string | null;
  city: string | null;
  state: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;
};

type ExistingDocument = {
  id: number;

  documentType:
    | "QUOTATION"
    | "ORDER_FORM";

  issuerInitials: string;

  customer: {
    nameFirmName: string;
    email: string;
    cc: string;
    phone: string;
    whatsapp: string;
    gstNumber: string;
    city: string;
    state: string;
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
  };

  gstType?:
    | "CGST_SGST"
    | "IGST";

  gstPercent: string;

  additionalNotes: string;

  items: {
    productId: number;
    categoryId: number;
    standardPrice: string;
    priceOverride: string;
    quantity: number;
  }[];
};

type ProductRow = {
  categoryId: string;
  productId: string;
  standardPrice: string;
  priceOverride: string;
  quantity: number;
};

type Props = {
  categories: Category[];
  products: Product[];
  customers?: CustomerOption[];
  document?: ExistingDocument;

  companyState: string;
  defaultGstPercent: string;
  defaultGstType: string;

  publicMode?: boolean;
  submitEndpoint?: string;
  previewBasePath?: string;
};

/* =========================================================
   HELPERS
========================================================= */

function createEmptyRow(): ProductRow {
  return {
    categoryId: "",
    productId: "",
    standardPrice: "",
    priceOverride: "",
    quantity: 1,
  };
}

function formatCurrency(
  value: number
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatPercent(
  value: number
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

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
  return value === "IGST"
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

function cleanIssuerInitials(
  value: string
) {
  return value
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
   COMPONENT
========================================================= */

export default function DocumentForm({
  categories,
  products,
  customers = [],
  document,
  companyState,
  defaultGstPercent,
  defaultGstType,

  publicMode = false,
  submitEndpoint,
  previewBasePath = "/documents",
}: Props) {
  const router =
    useRouter();

  const isEditing =
    Boolean(document);

  /* =======================================================
     DOCUMENT TYPE
  ======================================================= */

  const [
    documentType,
    setDocumentType,
  ] = useState<
    "QUOTATION" | "ORDER_FORM"
  >(
    document?.documentType ??
      "QUOTATION"
  );

  /* =======================================================
     ISSUER INITIALS
  ======================================================= */

  const [
    issuerInitials,
    setIssuerInitials,
  ] = useState(
    document?.issuerInitials ??
      ""
  );

  /* =======================================================
     SUBMIT MODE
  ======================================================= */

  const [
    submitMode,
    setSubmitMode,
  ] = useState<
    "draft" | "preview"
  >(
    "preview"
  );

  /* =======================================================
     EXISTING CUSTOMER
  ======================================================= */

  const [
    selectedCustomerId,
    setSelectedCustomerId,
  ] = useState(
    ""
  );

  /* =======================================================
     CUSTOMER SNAPSHOT
  ======================================================= */

  const [
    customer,
    setCustomer,
  ] = useState({
    nameFirmName:
      document?.customer
        .nameFirmName ??
      "",

    email:
      document?.customer
        .email ??
      "",

    cc:
      document?.customer
        .cc ??
      "",

    phone:
      document?.customer
        .phone ??
      "",

    whatsapp:
      document?.customer
        .whatsapp ??
      "",

    gstNumber:
      document?.customer
        .gstNumber ??
      "",

    city:
      document?.customer
        .city ??
      "",

    state:
      document?.customer
        .state ??
      "",

    addressLine1:
      document?.customer
        .addressLine1 ??
      "",

    addressLine2:
      document?.customer
        .addressLine2 ??
      "",

    addressLine3:
      document?.customer
        .addressLine3 ??
      "",
  });

  /* =======================================================
     PRODUCTS
  ======================================================= */

  const [
    rows,
    setRows,
  ] =
    useState<ProductRow[]>(
      document?.items
        ?.length
        ? document.items.map(
            (
              item
            ) => ({
              categoryId:
                item.categoryId.toString(),

              productId:
                item.productId.toString(),

              standardPrice:
                item.standardPrice,

              priceOverride:
                item.priceOverride,

              quantity:
                item.quantity,
            })
          )
        : [
            createEmptyRow(),
          ]
    );

  /* =======================================================
     GST
  ======================================================= */

  const gstPercent =
    Number(
      document?.gstPercent ??
        defaultGstPercent ??
        18
    );

  const gstType:
    GstType =
    determineGstType({
      customerState:
        customer.state,

      companyState,

      fallback:
        document?.gstType ??
        defaultGstType,
    });

  /* =======================================================
     NOTES
  ======================================================= */

  const [
    additionalNotes,
    setAdditionalNotes,
  ] = useState(
    document?.additionalNotes ??
      ""
  );

  /* =======================================================
     UI
  ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(
    false
  );

  const [
    error,
    setError,
  ] = useState(
    ""
  );

  /* =======================================================
     CUSTOMER HELPERS
  ======================================================= */

  function updateCustomer(
    field:
      keyof typeof customer,

    value: string
  ) {
    setCustomer(
      (
        current
      ) => ({
        ...current,

        [field]:
          value,
      })
    );
  }

  function handleExistingCustomerChange(
    customerId:
      string
  ) {
    setSelectedCustomerId(
      customerId
    );

    if (
      !customerId
    ) {
      return;
    }

    const selected =
      customers.find(
        (
          item
        ) =>
          item.id ===
          Number(
            customerId
          )
      );

    if (
      !selected
    ) {
      return;
    }

    setCustomer({
      nameFirmName:
        selected.nameFirmName,

      email:
        selected.email ??
        "",

      cc:
        "",

      phone:
        selected.phone ??
        "",

      whatsapp:
        selected.whatsapp ??
        "",

      gstNumber:
        selected.gstNumber ??
        "",

      city:
        selected.city ??
        "",

      state:
        selected.state ??
        "",

      addressLine1:
        selected.addressLine1 ??
        "",

      addressLine2:
        selected.addressLine2 ??
        "",

      addressLine3:
        selected.addressLine3 ??
        "",
    });
  }

  function clearCustomerForm() {
    setSelectedCustomerId(
      ""
    );

    setCustomer({
      nameFirmName:
        "",

      email:
        "",

      cc:
        "",

      phone:
        "",

      whatsapp:
        "",

      gstNumber:
        "",

      city:
        "",

      state:
        "",

      addressLine1:
        "",

      addressLine2:
        "",

      addressLine3:
        "",
    });
  }

  /* =======================================================
     PRODUCT HELPERS
  ======================================================= */

  function updateRow(
    index:
      number,

    field:
      keyof ProductRow,

    value:
      | string
      | number
  ) {
    setRows(
      (
        current
      ) => {
        const copy =
          [
            ...current,
          ];

        copy[
          index
        ] = {
          ...copy[
            index
          ],

          [field]:
            value,
        };

        return copy;
      }
    );
  }

  function handleCategoryChange(
    index:
      number,

    categoryId:
      string
  ) {
    setRows(
      (
        current
      ) => {
        const copy =
          [
            ...current,
          ];

        copy[
          index
        ] = {
          ...copy[
            index
          ],

          categoryId,

          productId:
            "",

          standardPrice:
            "",

          priceOverride:
            "",
        };

        return copy;
      }
    );
  }

  function handleProductChange(
    index:
      number,

    productId:
      string
  ) {
    const selectedProduct =
      products.find(
        (
          product
        ) =>
          product.id ===
          Number(
            productId
          )
      );

    setRows(
      (
        current
      ) => {
        const copy =
          [
            ...current,
          ];

        copy[
          index
        ] = {
          ...copy[
            index
          ],

          productId,

          standardPrice:
            selectedProduct
              ?.standardPrice ??
            "",

          priceOverride:
            "",
        };

        return copy;
      }
    );
  }

  function addProductRow() {
    setRows(
      (
        current
      ) => [
        ...current,

        createEmptyRow(),
      ]
    );
  }

  function removeProductRow(
    index:
      number
  ) {
    if (
      rows.length <=
      1
    ) {
      return;
    }

    setRows(
      (
        current
      ) =>
        current.filter(
          (
            _,
            rowIndex
          ) =>
            rowIndex !==
            index
        )
    );
  }

  function getFinalPrice(
    row:
      ProductRow
  ) {
    if (
      row.priceOverride !==
      ""
    ) {
      const override =
        Number(
          row.priceOverride
        );

      if (
        Number.isFinite(
          override
        )
      ) {
        return override;
      }
    }

    return Number(
      row.standardPrice ||
        0
    );
  }

  function getLineTotal(
    row:
      ProductRow
  ) {
    return (
      getFinalPrice(
        row
      ) *
      Number(
        row.quantity ||
          1
      )
    );
  }

  /* =======================================================
     TOTALS
  ======================================================= */

  const subtotal =
    useMemo(
      () =>
        rows.reduce(
          (
            sum,
            row
          ) =>
            sum +
            getLineTotal(
              row
            ),

          0
        ),

      [
        rows,
      ]
    );

  const gstAmount =
    subtotal *
    (
      gstPercent /
      100
    );

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

  const grandTotal =
    subtotal +
    gstAmount;

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(
      true
    );

    setError(
      ""
    );

    try {
      /* ---------------------------------------
         ISSUER
      --------------------------------------- */

      const cleanedIssuerInitials =
        cleanIssuerInitials(
          issuerInitials
        );

      if (
        !cleanedIssuerInitials
      ) {
        throw new Error(
          "Issuer initials are required."
        );
      }

      /* ---------------------------------------
         CUSTOMER
      --------------------------------------- */

      if (
        !customer
          .nameFirmName
          .trim()
      ) {
        throw new Error(
          "Name / Firm Name is required."
        );
      }

      if (
        !customer
          .state
          .trim()
      ) {
        throw new Error(
          "Please select customer state."
        );
      }

      /* ---------------------------------------
         PRODUCTS
      --------------------------------------- */

      const validRows =
        rows.filter(
          (
            row
          ) =>
            row.productId !==
            ""
        );

      if (
        validRows.length ===
        0
      ) {
        throw new Error(
          "Please add at least one product."
        );
      }

      /* ---------------------------------------
         API
      --------------------------------------- */

      const url =
        submitEndpoint ??
        (
          isEditing
            ? `/api/documents/${document!.id}`
            : "/api/documents"
        );

      const response =
        await fetch(
          url,
          {
            method:
              publicMode
                ? "POST"
                : isEditing
                  ? "PUT"
                  : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                existingDocumentId:
                  publicMode && isEditing
                    ? document!.id
                    : null,

                documentType,

                issuerInitials:
                  cleanedIssuerInitials,

                customer,

                selectedCustomerId:
                  selectedCustomerId
                    ? Number(
                        selectedCustomerId
                      )
                    : null,

                gstType,

                gstPercent,

                additionalNotes,

                saveAsDraft:
                  submitMode ===
                  "draft",

                items:
                  validRows.map(
                    (
                      row
                    ) => ({
                      productId:
                        Number(
                          row.productId
                        ),

                      quantity:
                        Number(
                          row.quantity
                        ),

                      priceOverride:
                        row.priceOverride ===
                        ""
                          ? null
                          : Number(
                              row.priceOverride
                            ),
                    })
                  ),
              }),
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        );

      if (
        !contentType?.includes(
          "application/json"
        )
      ) {
        const text =
          await response.text();

        console.error(
          "DOCUMENT API NON JSON:",
          response.status,
          text
        );

        throw new Error(
          `Document API returned ${response.status}.`
        );
      }

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          result.message ??
            "Unable to save document."
        );
      }

      const documentId =
        result.data.id;

      /* ---------------------------------------
         REDIRECT
      --------------------------------------- */

      if (
        submitMode ===
        "draft"
      ) {
        router.push(
          "/documents"
        );
      } else {
        router.push(
          `${previewBasePath}/${documentId}/preview`
        );
      }

      router.refresh();
    } catch (
      error
    ) {
      setError(
        error instanceof
          Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-6"
    >
      {/* Error */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =================================================
          1. DOCUMENT DETAILS
      ================================================= */}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          1. Document Details
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Select the document type and enter the initials of
          the person issuing the document.
        </p>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {/* Document Type */}

          <div>
            <Label>
              Document Type
            </Label>

            <div className="flex flex-wrap gap-3">
              <DocumentTypeButton
                active={
                  documentType ===
                  "QUOTATION"
                }
                onClick={() =>
                  setDocumentType(
                    "QUOTATION"
                  )
                }
              >
                Quotation
              </DocumentTypeButton>

              <DocumentTypeButton
  active={
    documentType ===
    "ORDER_FORM"
  }
  onClick={() =>
    setDocumentType(
      "ORDER_FORM"
    )
  }
>
  Order Form
</DocumentTypeButton>
            </div>
          </div>

          {/* Issuer Initials */}

          <div>
            <Label>
              Issuer Initials *
            </Label>

            <input
              type="text"
              value={
                issuerInitials
              }
              required
              maxLength={
                4
              }
              placeholder="e.g. PT"
              autoComplete="off"
              onChange={(
                event
              ) =>
                setIssuerInitials(
                  cleanIssuerInitials(
                    event.target.value
                  )
                )
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 uppercase outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />

            <p className="mt-2 text-xs text-slate-500">
              Used in the reference number, for example:
              SDPM/RJ/26-27/PT/001
            </p>
          </div>
        </div>
      </section>

      {/* =================================================
          2. CUSTOMER DETAILS
      ================================================= */}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            2. Customer Details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select an existing customer or enter a new customer below.
          </p>
        </div>

        {/* Existing Customer */}

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <Label>
                Select Existing Customer
              </Label>

              <select
                value={
                  selectedCustomerId
                }
                onChange={(
                  event
                ) =>
                  handleExistingCustomerChange(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              >
                <option value="">
                  Enter New Customer / Firm
                </option>

                {customers.map(
                  (
                    customerOption
                  ) => (
                    <option
                      key={
                        customerOption.id
                      }
                      value={
                        customerOption.id
                      }
                    >
                      {
                        customerOption.nameFirmName
                      }

                      {customerOption.city
                        ? ` — ${customerOption.city}`
                        : ""}

                      {customerOption.phone
                        ? ` — ${customerOption.phone}`
                        : ""}
                    </option>
                  )
                )}
              </select>

              <p className="mt-2 text-xs text-slate-500">
                Selecting a customer will auto-fill the fields below.
                You can still edit the details for this document.
              </p>
            </div>

            <div className="lg:pt-[30px]">
              <button
                type="button"
                onClick={
                  clearCustomerForm
                }
                className="w-full whitespace-nowrap rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 lg:w-auto"
              >
                New Customer
              </button>
            </div>
          </div>

          {selectedCustomerId && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Existing customer selected. Details have been loaded below.
            </div>
          )}

          {!selectedCustomerId &&
            !isEditing && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                If this is a new customer, they will automatically be
                added to the Customer directory when the document is saved.
              </div>
            )}
        </div>

        {/* Customer Fields */}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <InputField
            label="Name / Firm Name *"
            value={
              customer.nameFirmName
            }
            required
            onChange={(
              value
            ) =>
              updateCustomer(
                "nameFirmName",
                value
              )
            }
          />

          <InputField
            label="Email / To"
            value={
              customer.email
            }
            placeholder="sales@example.com, owner@example.com"
            onChange={(
              value
            ) =>
              updateCustomer(
                "email",
                value
              )
            }
          />

          <InputField
            label="CC"
            value={
              customer.cc
            }
            placeholder="accounts@example.com"
            onChange={(
              value
            ) =>
              updateCustomer(
                "cc",
                value
              )
            }
          />

          <InputField
            label="Phone"
            value={
              customer.phone
            }
            onChange={(
              value
            ) =>
              updateCustomer(
                "phone",
                value
              )
            }
          />

          <InputField
            label="WhatsApp"
            value={
              customer.whatsapp
            }
            onChange={(
              value
            ) =>
              updateCustomer(
                "whatsapp",
                value
              )
            }
          />

          <InputField
            label="GST Number"
            value={
              customer.gstNumber
            }
            onChange={(
              value
            ) =>
              updateCustomer(
                "gstNumber",
                value
              )
            }
          />

          <InputField
            label="City"
            value={
              customer.city
            }
            onChange={(
              value
            ) =>
              updateCustomer(
                "city",
                value
              )
            }
          />

          {/* State Dropdown */}

          <div>
            <Label>
              State *
            </Label>

            <select
              value={
                customer.state
              }
              required
              onChange={(
                event
              ) =>
                updateCustomer(
                  "state",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            >
              <option value="">
                Select State
              </option>

              {INDIA_STATES.map(
                (
                  state
                ) => (
                  <option
                    key={
                      state.code
                    }
                    value={
                      state.name
                    }
                  >
                    {state.name} ({state.code})
                  </option>
                )
              )}
            </select>
          </div>

          <InputField
            label="Address Line 1"
            value={
              customer.addressLine1
            }
            onChange={(
              value
            ) =>
              updateCustomer(
                "addressLine1",
                value
              )
            }
          />

          <InputField
            label="Address Line 2"
            value={
              customer.addressLine2
            }
            onChange={(
              value
            ) =>
              updateCustomer(
                "addressLine2",
                value
              )
            }
          />

          <InputField
            label="Address Line 3"
            value={
              customer.addressLine3
            }
            onChange={(
              value
            ) =>
              updateCustomer(
                "addressLine3",
                value
              )
            }
          />
        </div>

        {/* Automatic GST Status */}

        <div
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            gstType ===
            "CGST_SGST"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          <div className="font-medium">
            GST Type:{" "}
            {gstType ===
            "CGST_SGST"
              ? "CGST + SGST"
              : "IGST"}
          </div>

          <div className="mt-1 text-xs opacity-80">
            Company State:{" "}
            {companyState ||
              "Not configured"}

            {" • "}

            Customer State:{" "}
            {customer.state ||
              "Not selected"}
          </div>
        </div>
      </section>

      {/* =================================================
          3. PRODUCTS
      ================================================= */}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          3. Products
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Select category and product. Override pricing only when required.
        </p>

        <div className="mt-6 space-y-4">
          {rows.map(
            (
              row,
              index
            ) => {
              const availableProducts =
                products.filter(
                  (
                    product
                  ) =>
                    product.categoryId ===
                    Number(
                      row.categoryId
                    )
                );

              const selectedProduct =
                products.find(
                  (
                    product
                  ) =>
                    product.id ===
                    Number(
                      row.productId
                    )
                );

              return (
                <div
                  key={
                    index
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <div>
                      <Label>
                        Category
                      </Label>

                      <select
                        value={
                          row.categoryId
                        }
                        required
                        onChange={(
                          event
                        ) =>
                          handleCategoryChange(
                            index,
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
                      >
                        <option value="">
                          Select Category
                        </option>

                        {categories.map(
                          (
                            category
                          ) => (
                            <option
                              key={
                                category.id
                              }
                              value={
                                category.id
                              }
                            >
                              {
                                category.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <Label>
                        Product
                      </Label>

                      <select
                        value={
                          row.productId
                        }
                        required
                        disabled={
                          !row.categoryId
                        }
                        onChange={(
                          event
                        ) =>
                          handleProductChange(
                            index,
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 disabled:bg-slate-100"
                      >
                        <option value="">
                          Select Product
                        </option>

                        {availableProducts.map(
                          (
                            product
                          ) => (
                            <option
                              key={
                                product.id
                              }
                              value={
                                product.id
                              }
                            >
                              {
                                product.name
                              }

                              {product.model
                                ? ` - ${product.model}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <Label>
                        Standard Price
                      </Label>

                      <input
                        readOnly
                        value={
                          row.standardPrice
                            ? formatCurrency(
                                Number(
                                  row.standardPrice
                                )
                              )
                            : ""
                        }
                        placeholder="₹0.00"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
                      />
                    </div>

                    <div>
                      <Label>
                        Price Override
                      </Label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          row.priceOverride
                        }
                        onChange={(
                          event
                        ) =>
                          updateRow(
                            index,
                            "priceOverride",
                            event.target.value
                          )
                        }
                        placeholder="Optional"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
                      />
                    </div>

                    <div>
                      <Label>
                        Qty
                      </Label>

                      <input
                        type="number"
                        min="1"
                        value={
                          row.quantity
                        }
                        onChange={(
                          event
                        ) =>
                          updateRow(
                            index,
                            "quantity",
                            Math.max(
                              1,
                              Number(
                                event.target.value
                              )
                            )
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
                      />
                    </div>

                    <div>
                      <Label>
                        Line Total
                      </Label>

                      <input
                        readOnly
                        value={formatCurrency(
                          getLineTotal(
                            row
                          )
                        )}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-medium"
                      />
                    </div>
                  </div>

                  {selectedProduct && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase text-slate-400">
                            Model
                          </div>

                          <div className="mt-1 text-sm font-medium text-slate-700">
                            {selectedProduct.model ||
                              "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase text-slate-400">
                            Description
                          </div>

                          <div className="mt-1 text-sm text-slate-600">
                            {selectedProduct.description ||
                              "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {rows.length >
                    1 && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          removeProductRow(
                            index
                          )
                        }
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Remove Product
                      </button>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>

        <button
          type="button"
          onClick={
            addProductRow
          }
          className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          + Add More Product
        </button>
      </section>

      {/* =================================================
          4. NOTES & TOTALS
      ================================================= */}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          4. Notes & Totals
        </h2>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <Label>
              Additional Notes
            </Label>

            <textarea
              rows={
                6
              }
              value={
                additionalNotes
              }
              onChange={(
                event
              ) =>
                setAdditionalNotes(
                  event.target.value
                )
              }
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-5">
            <div className="space-y-4">
              <SummaryRow
                label="Subtotal"
                value={formatCurrency(
                  subtotal
                )}
              />

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  GST Rate
                </span>

                <strong className="text-sm text-slate-900">
                  {formatPercent(
                    gstPercent
                  )}
                  %
                </strong>
              </div>

              <p className="-mt-2 text-right text-xs text-slate-400">
                GST rate is managed from Admin Settings.
              </p>

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  GST Type
                </div>

                <div className="mt-1 text-sm font-semibold text-slate-800">
                  {gstType ===
                  "CGST_SGST"
                    ? "CGST + SGST"
                    : "IGST"}
                </div>
              </div>

              {gstType ===
              "CGST_SGST" ? (
                <>
                  <SummaryRow
                    label={`CGST ${formatPercent(
                      cgstPercent
                    )}%`}
                    value={formatCurrency(
                      cgstAmount
                    )}
                  />

                  <SummaryRow
                    label={`SGST ${formatPercent(
                      sgstPercent
                    )}%`}
                    value={formatCurrency(
                      sgstAmount
                    )}
                  />
                </>
              ) : (
                <SummaryRow
                  label={`IGST ${formatPercent(
                    igstPercent
                  )}%`}
                  value={formatCurrency(
                    igstAmount
                  )}
                />
              )}

              <div className="flex justify-between border-t border-slate-200 pt-4 text-lg">
                <strong>
                  Grand Total
                </strong>

                <strong>
                  {formatCurrency(
                    grandTotal
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          ACTIONS
      ================================================= */}

      <div className="flex flex-wrap justify-end gap-3 pb-8">
        {isEditing && (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/documents/${document!.id}/preview`
              )
            }
            disabled={
              loading
            }
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}

        {!publicMode && (
          <button
            type="submit"
            disabled={
              loading
            }
            onClick={() =>
              setSubmitMode(
                "draft"
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading &&
            submitMode ===
              "draft"
              ? "Saving Draft..."
              : "Save Draft"}
          </button>
        )}

        <button
          type="submit"
          disabled={
            loading
          }
          onClick={() =>
            setSubmitMode(
              "preview"
            )
          }
          className="rounded-lg bg-slate-950 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading &&
          submitMode ===
            "preview"
            ? "Saving..."
            : isEditing
              ? "Save & Preview"
              : "Generate Preview"}
        </button>
      </div>
    </form>
  );
}

/* =========================================================
   DOCUMENT TYPE BUTTON
========================================================= */

function DocumentTypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;

  onClick:
    () => void;

  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-slate-950 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

/* =========================================================
   LABEL
========================================================= */

function Label({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <label className="mb-2 block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

/* =========================================================
   INPUT FIELD
========================================================= */

function InputField({
  label,
  value,
  onChange,
  required = false,
  placeholder,
}: {
  label: string;

  value: string;

  onChange:
    (
      value:
        string
    ) => void;

  required?:
    boolean;

  placeholder?:
    string;
}) {
  return (
    <div>
      <Label>
        {label}
      </Label>

      <input
        value={
          value
        }
        required={
          required
        }
        placeholder={
          placeholder
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      />
    </div>
  );
}

/* =========================================================
   SUMMARY ROW
========================================================= */

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">
        {label}
      </span>

      <strong className="text-right text-slate-900">
        {value}
      </strong>
    </div>
  );
}