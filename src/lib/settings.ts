import { prisma } from "@/lib/prisma";

export const SETTING_KEYS = {
  GST: "gst",
  GST_TYPE: "gst_type",
  COMPANY_STATE: "company_state",

  TERMS: "terms",
  WARRANTY: "warranty",
  HEADER_BANNER: "header_banner",
  FOOTER_BANNER: "footer_banner",
  QUOTE_FOOTER: "quote_footer",
  SIGNATURE_IMAGE: "signature_image",
  REFERENCE_PREFIX: "reference_prefix",
  BANK_DETAILS: "bank_details",
  QUOTATION_START_NUMBER: "quotation_start_number",
  ORDER_FORM_START_NUMBER: "order_form_start_number",
} as const;

export async function getSetting(
  key: string,
  fallback: string | null = null
) {
  const setting =
    await prisma.setting.findUnique({
      where: {
        key,
      },
    });

  return setting?.value ?? fallback;
}

export async function getSettings() {
  const settings =
    await prisma.setting.findMany();

  const map = new Map(
    settings.map((setting) => [
      setting.key,
      setting.value ?? "",
    ])
  );


  return {
    gst:
      map.get(SETTING_KEYS.GST) ??
      "18",

    gstType:
  map.get(SETTING_KEYS.GST_TYPE) ??
  "CGST_SGST",

companyState:
  map.get(SETTING_KEYS.COMPANY_STATE) ??
  "",

    terms:
      map.get(SETTING_KEYS.TERMS) ??
      "",

    warranty:
      map.get(SETTING_KEYS.WARRANTY) ??
      "",

    headerBanner:
      map.get(
        SETTING_KEYS.HEADER_BANNER
      ) ?? "",

    footerBanner:
      map.get(
        SETTING_KEYS.FOOTER_BANNER
      ) ?? "",

    quoteFooter:
      map.get(
        SETTING_KEYS.QUOTE_FOOTER
      ) ?? "",

    signatureImage:
      map.get(
        SETTING_KEYS.SIGNATURE_IMAGE
      ) ?? "",

       bankDetails:
    map.get(
      SETTING_KEYS.BANK_DETAILS
    ) ?? "",

    referencePrefix:
      map.get(
        SETTING_KEYS.REFERENCE_PREFIX
      ) ?? "SDPM/RJ/OE",

    quotationStartNumber:
      map.get(
        SETTING_KEYS.QUOTATION_START_NUMBER
      ) ?? "1",

    orderFormStartNumber:
      map.get(
        SETTING_KEYS.ORDER_FORM_START_NUMBER
      ) ?? "1",
  };
}

export async function saveSetting(
  key: string,
  value: string,
  type = "text"
) {
  return prisma.setting.upsert({
    where: {
      key,
    },

    update: {
      value,
      type,
    },

    create: {
      key,
      value,
      type,
    },
  });
}