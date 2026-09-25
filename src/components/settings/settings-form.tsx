"use client";

import {
  FormEvent,
  useState,
} from "react";

import RichTextEditor from "@/components/editor/rich-text-editor";

type Props = {
  initialSettings: {
    gst: string;

    gstType: string;
    companyState: string;

    terms: string;

    warranty: string;

    headerBanner: string;

    footerBanner: string;

    quoteFooter: string;

    signatureImage: string;

    referencePrefix: string;

    bankDetails: string;

    quotationStartNumber: string;

    orderFormStartNumber: string;
  };
};

export default function SettingsForm({
  initialSettings,
}: Props) {
  const [
    gst,
    setGst,
  ] = useState(
    initialSettings.gst
  );

  const [gstType, setGstType] =
  useState(
    initialSettings.gstType
  );

const [companyState, setCompanyState] =
  useState(
    initialSettings.companyState
  );

  const [
    quotationStartNumber,
    setQuotationStartNumber,
  ] = useState(
    initialSettings.quotationStartNumber
  );

  const [
    orderFormStartNumber,
    setOrderFormStartNumber,
  ] = useState(
    initialSettings.orderFormStartNumber
  );

  const [
    terms,
    setTerms,
  ] = useState(
    initialSettings.terms
  );

  const [
    warranty,
    setWarranty,
  ] = useState(
    initialSettings.warranty
  );

  const [
    quoteFooter,
    setQuoteFooter,
  ] = useState(
    initialSettings.quoteFooter
  );

  const [
    referencePrefix,
    setReferencePrefix,
  ] = useState(
    initialSettings.referencePrefix
  );

  const [
    headerBanner,
    setHeaderBanner,
  ] = useState(
    initialSettings.headerBanner
  );

  const [
    footerBanner,
    setFooterBanner,
  ] = useState(
    initialSettings.footerBanner
  );

  const [
    signatureImage,
    setSignatureImage,
  ] = useState(
    initialSettings.signatureImage
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
  bankDetails,
  setBankDetails,
] = useState(
  initialSettings.bankDetails
);

  async function saveSettings(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);

    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/settings",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                gst,

                gstType,
                companyState,
                quotationStartNumber,
                orderFormStartNumber,

                terms,

                warranty,

                quoteFooter,

                bankDetails,

                referencePrefix,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Unable to save settings."
        );
      }

      setSuccess(
        "Settings saved successfully."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(
    field:
      | "header_banner"
      | "footer_banner"
      | "signature_image",

    file: File
  ) {
    setError("");
    setSuccess("");

    try {
      const formData =
        new FormData();

      formData.append(
        "field",
        field
      );

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/settings/upload",
          {
            method: "POST",

            body:
              formData,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Unable to upload image."
        );
      }

      if (
        field ===
        "header_banner"
      ) {
        setHeaderBanner(
          result.path
        );
      }

      if (
        field ===
        "footer_banner"
      ) {
        setFooterBanner(
          result.path
        );
      }

      if (
        field ===
        "signature_image"
      ) {
        setSignatureImage(
          result.path
        );
      }

      setSuccess(
        "Image uploaded successfully."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to upload image."
      );
    }
  }

  return (
    <form
      onSubmit={
        saveSettings
      }
      className="space-y-8"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* General */}
      <SettingsSection
        title="Document Settings"
        description="Global document values used in quotations and order forms."
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
  <div>
    <Label>
      GST Rate (%)
    </Label>

    <input
      type="number"
      min="0"
      max="100"
      step="0.01"
      value={gst}
      onChange={(event) =>
        setGst(
          event.target.value
        )
      }
      className="w-full rounded-lg border border-slate-300 px-4 py-3"
    />

    <p className="mt-2 text-xs text-slate-500">
      Total GST percentage, for example 18%.
    </p>
  </div>

  <div>
    <Label>
      Default GST Type
    </Label>

    <select
      value={gstType}
      onChange={(event) =>
        setGstType(
          event.target.value
        )
      }
      className="w-full rounded-lg border border-slate-300 px-4 py-3"
    >
      <option value="CGST_SGST">
        CGST + SGST
      </option>

      <option value="IGST">
        IGST
      </option>
    </select>

    <p className="mt-2 text-xs text-slate-500">
      CGST + SGST for intra-state sales, IGST for inter-state sales.
    </p>
  </div>

  <div>
    <Label>
      Company State
    </Label>

    <input
      value={companyState}
      onChange={(event) =>
        setCompanyState(
          event.target.value
        )
      }
      placeholder="Rajasthan"
      className="w-full rounded-lg border border-slate-300 px-4 py-3"
    />

    <p className="mt-2 text-xs text-slate-500">
      Used to automatically choose GST type based on customer state.
    </p>
  </div>
</div>
      </SettingsSection>

      <SettingsSection
        title="Document Numbering"
        description="Set the minimum serial number used for new quotations and order forms. Each document type maintains its own sequence."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label>
              Quotation Starting Serial
            </Label>

            <input
              type="number"
              min="1"
              step="1"
              value={quotationStartNumber}
              onChange={(event) =>
                setQuotationStartNumber(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />

            <p className="mt-2 text-xs text-slate-500">
              Used as the first quotation serial if no higher quotation serial already exists for the current financial year.
            </p>
          </div>

          <div>
            <Label>
              Order Form Starting Serial
            </Label>

            <input
              type="number"
              min="1"
              step="1"
              value={orderFormStartNumber}
              onChange={(event) =>
                setOrderFormStartNumber(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />

            <p className="mt-2 text-xs text-slate-500">
              Used as the first order form serial if no higher order form serial already exists for the current financial year.
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* Header */}
      <SettingsSection
        title="Header Banner"
        description="Full-width image displayed at the top of every generated page."
      >
        <ImageSetting
          image={
            headerBanner
          }
          label="Header Banner"
          onSelect={(
            file
          ) =>
            uploadImage(
              "header_banner",
              file
            )
          }
        />
      </SettingsSection>

      {/* Footer */}
      <SettingsSection
        title="Footer Banner"
        description="Full-width image displayed at the bottom of every generated page."
      >
        <ImageSetting
          image={
            footerBanner
          }
          label="Footer Banner"
          onSelect={(
            file
          ) =>
            uploadImage(
              "footer_banner",
              file
            )
          }
        />
      </SettingsSection>

      {/* Terms */}
      <SettingsSection
        title="Terms & Conditions"
        description="Displayed after Page 1 of the generated document."
      >
        <RichTextEditor
          value={terms}
          onChange={
            setTerms
          }
        />
      </SettingsSection>

      {/* Warranty */}
      <SettingsSection
        title="Warranty"
        description="Warranty content maintained separately from Terms & Conditions."
      >
        <RichTextEditor
          value={
            warranty
          }
          onChange={
            setWarranty
          }
        />
      </SettingsSection>

      {/* Bank Details */}

<SettingsSection
  title="Bank Details"
  description="Displayed on Order Form PDFs for customer bank transfer. This does not appear on quotations."
>
  <RichTextEditor
    value={
      bankDetails
    }
    onChange={
      setBankDetails
    }
  />

  <p className="mt-3 text-xs text-slate-500">
    Suggested details: Account Name, Bank Name, Account Number,
    IFSC Code, Branch and SWIFT Code if required.
  </p>
</SettingsSection>

      {/* Signature */}
      <SettingsSection
        title="Quote Signature"
        description="Signature content displayed at the end of Page 1."
      >
        <div className="space-y-6">
          <RichTextEditor
            value={
              quoteFooter
            }
            onChange={
              setQuoteFooter
            }
          />

          <div>
            <Label>
              Signature Image
            </Label>

            <ImageSetting
              image={
                signatureImage
              }
              label="Signature"
              onSelect={(
                file
              ) =>
                uploadImage(
                  "signature_image",
                  file
                )
              }
            />
          </div>
        </div>
      </SettingsSection>

      <div className="flex justify-end border-t border-slate-200 pt-6">
        <button
          type="submit"
          disabled={
            loading
          }
          className="rounded-lg bg-slate-950 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : "Save Settings"}
        </button>
      </div>
    </form>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;

  description: string;

  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

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

function ImageSetting({
  image,
  label,
  onSelect,
}: {
  image: string;

  label: string;

  onSelect:
    (file: File) =>
      void;
}) {
  return (
    <div>
      {image && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <img
            src={image}
            alt={label}
            className="max-h-52 max-w-full object-contain"
          />
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={(
          event
        ) => {
          const file =
            event.target
              .files?.[0];

          if (file) {
            onSelect(file);
          }
        }}
        className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm"
      />
    </div>
  );
}