import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getSession } from "@/lib/auth";
import {
  SETTING_KEYS,
  saveSetting,
} from "@/lib/settings";

export async function POST(
  request: NextRequest
) {
  try {
    const session =
  await getSession();

if (!session) {
  return NextResponse.json(
    {
      success: false,
      message: "Unauthorized.",
    },
    {
      status: 401,
    }
  );
}

if (
  session.role !== "ADMIN"
) {
  return NextResponse.json(
    {
      success: false,
      message:
        "Administrator access is required.",
    },
    {
      status: 403,
    }
  );
}

    const body =
      await request.json();

    const gst =
      Number(body.gst);

      const gstType =
  body.gstType === "IGST"
    ? "IGST"
    : "CGST_SGST";

const companyState =
  String(
    body.companyState ?? ""
  ).trim();

const quotationStartNumber =
  Number(
    body.quotationStartNumber
  );

const orderFormStartNumber =
  Number(
    body.orderFormStartNumber
  );

    if (
      !Number.isFinite(gst) ||
      gst < 0 ||
      gst > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "GST must be between 0 and 100.",
        },
        {
          status: 422,
        }
      );
    }

    if (
      !Number.isInteger(
        quotationStartNumber
      ) ||
      quotationStartNumber < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Quotation starting serial must be a whole number greater than 0.",
        },
        {
          status: 422,
        }
      );
    }

    if (
      !Number.isInteger(
        orderFormStartNumber
      ) ||
      orderFormStartNumber < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order Form starting serial must be a whole number greater than 0.",
        },
        {
          status: 422,
        }
      );
    }

    await Promise.all([
      saveSetting(
        SETTING_KEYS.GST,
        gst.toString(),
        "number"
      ),

      saveSetting(
  SETTING_KEYS.GST_TYPE,
  gstType,
  "text"
),

saveSetting(
  SETTING_KEYS.COMPANY_STATE,
  companyState,
  "text"
),

saveSetting(
  SETTING_KEYS.QUOTATION_START_NUMBER,
  quotationStartNumber.toString(),
  "number"
),

saveSetting(
  SETTING_KEYS.ORDER_FORM_START_NUMBER,
  orderFormStartNumber.toString(),
  "number"
),

saveSetting(
  SETTING_KEYS.BANK_DETAILS,

  String(
    body.bankDetails ??
      ""
  ),

  "editor"
),

      saveSetting(
        SETTING_KEYS.TERMS,
        String(
          body.terms ?? ""
        ),
        "editor"
      ),

      saveSetting(
        SETTING_KEYS.WARRANTY,
        String(
          body.warranty ?? ""
        ),
        "editor"
      ),

      saveSetting(
        SETTING_KEYS.QUOTE_FOOTER,
        String(
          body.quoteFooter ?? ""
        ),
        "editor"
      ),

      saveSetting(
        SETTING_KEYS.REFERENCE_PREFIX,
        String(
          body.referencePrefix ??
            "SDPM/RJ/OE"
        ).trim(),
        "text"
      ),
    ]);

    return NextResponse.json({
      success: true,

      message:
        "Settings updated successfully.",
    });
  } catch (error) {
    console.error(
      "UPDATE SETTINGS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to update settings.",
      },
      {
        status: 500,
      }
    );
  }
}