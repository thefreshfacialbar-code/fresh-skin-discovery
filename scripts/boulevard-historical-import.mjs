import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
const IMPORT_ENABLED = false;
const CUSTOMER_IMPORT_ENABLED = false;
const BULK_CUSTOMER_IMPORT_ENABLED = false;
const BULK_CUSTOMER_BATCH_SIZE = 89    ;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
function normalizeBoulevardId(value, type) {
  const id = String(value ?? "").trim();

  if (!id) return null;

  const prefix = `urn:blvd:${type}:`;

  return id.startsWith(prefix) ? id : `${prefix}${id}`;
}

const filePath = process.argv[2];

if (!filePath) {
  console.error(
    'Usage: node scripts/boulevard-historical-import.mjs "path/to/file.csv"'
  );
  process.exit(1);
}

const csv = fs.readFileSync(filePath, "utf8");

const rows = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  bom: true,
  relax_column_count: true,
});

// Exclude report summary rows.
const transactions = rows.filter(
  (row) =>
    row["Order ID"]?.trim() &&
    row["Line item ID"]?.trim()
);

const orders = new Set(
  transactions.map((row) => row["Order ID"].trim())
);

const customers = new Set(
  transactions
    .map((row) => row["Client ID"]?.trim())
    .filter(Boolean)
);

const itemTypes = {};

for (const row of transactions) {
  const type = row["Item type"] || "Unknown";
  itemTypes[type] = (itemTypes[type] || 0) + 1;
}

console.log("\nBOULEVARD HISTORICAL IMPORT — DRY RUN");
console.log("------------------------------------");
console.log("CSV rows:", rows.length);
console.log("Transaction rows:", transactions.length);
console.log("Unique orders:", orders.size);
console.log("Unique Boulevard clients:", customers.size);
console.log("\nItem types:");
console.table(itemTypes);
console.log("\nSample normalized identifiers:");

const sample = transactions[0];

console.log({
  orderNumber: sample["Order number"],
  orderId: normalizeBoulevardId(sample["Order ID"], "Order"),
  clientId: normalizeBoulevardId(sample["Client ID"], "Client"),
  externalClientId: sample["Client external ID"] || null,
  originalOrderDate: sample["Order date"],
});
const FRESH_BUSINESS_ID = "fe7198ae-61f5-4e7b-892f-138e41d713d4";

const historicalOrderIds = [
  ...new Set(
    transactions
      .map((row) => normalizeBoulevardId(row["Order ID"], "Order"))
      .filter(Boolean)
  ),
];

const existingOrders = [];
const ORDER_BATCH_SIZE = 100;
const HISTORICAL_IMPORT_BATCH_SIZE = 100;

for (let i = 0; i < historicalOrderIds.length; i += ORDER_BATCH_SIZE) {
  const batch = historicalOrderIds.slice(i, i + ORDER_BATCH_SIZE);

  const { data, error } = await supabase
    .from("boulevard_orders")
    .select(
      "id, boulevard_order_id, boulevard_order_number, customer_id"
    )
    .eq("business_id", FRESH_BUSINESS_ID)
    .in("boulevard_order_id", batch);

  if (error) {
    throw new Error(
      `Could not check existing Boulevard orders in batch ${
        Math.floor(i / ORDER_BATCH_SIZE) + 1
      }: ${error.message}`
    );
  }

  existingOrders.push(...(data ?? []));
}

console.log(
  `Checked ${historicalOrderIds.length} historical order IDs in batches of ${ORDER_BATCH_SIZE}.`
);

const existingOrderIds = new Set(
  (existingOrders ?? []).map((order) => order.boulevard_order_id)
);

const newOrderIds = historicalOrderIds.filter(
  (orderId) => !existingOrderIds.has(orderId)
);

console.log("\nSUPABASE ORDER COMPARISON");
console.log("------------------------");
console.log("Orders in CSV:", historicalOrderIds.length);
console.log("Already in Supabase:", existingOrderIds.size);
console.log("Not yet in Supabase:", newOrderIds.length);

console.log("\nExisting orders:");
console.table(
  (existingOrders ?? []).map((order) => ({
    orderNumber: order.boulevard_order_number,
    customerId: order.customer_id,
  }))
);
const historicalClientIds = [
  ...new Set(
    transactions
      .map((row) => normalizeBoulevardId(row["Client ID"], "Client"))
      .filter(Boolean)
  ),
];

const { data: customerOrders, error: customerOrdersError } =
  await supabase
    .from("boulevard_orders")
    .select("boulevard_client_id, customer_id")
    .eq("business_id", FRESH_BUSINESS_ID)
    .in("boulevard_client_id", historicalClientIds);

if (customerOrdersError) {
  throw new Error(
    `Could not check Boulevard customer matches: ${customerOrdersError.message}`
  );
}
const { data: boulevardIdentities, error: identityError } =
  await supabase
    .from("customer_identities")
    .select("source_customer_id, customer_id")
    .eq("source_system", "boulevard")
    .in("source_customer_id", historicalClientIds);

if (identityError) {
  throw new Error(
    `Could not check Boulevard identities: ${identityError.message}`
  );
}
const { data: freshCustomers, error: freshCustomersError } =
  await supabase
    .from("customers")
    .select("id, email")
    .eq("business_id", FRESH_BUSINESS_ID);

if (freshCustomersError) {
  throw new Error(
    `Could not load Fresh Desk customers: ${freshCustomersError.message}`
  );
}
const customerMatches = new Map();

for (const order of customerOrders ?? []) {
  if (!customerMatches.has(order.boulevard_client_id)) {
    customerMatches.set(order.boulevard_client_id, new Set());
  }

  if (order.customer_id) {
    customerMatches.get(order.boulevard_client_id).add(order.customer_id);
  }
}
for (const identity of boulevardIdentities ?? []) {
  const clientId = identity.source_customer_id;

  if (!customerMatches.has(clientId)) {
    customerMatches.set(clientId, new Set());
  }

  if (identity.customer_id) {
    customerMatches.get(clientId).add(identity.customer_id);
  }
}
console.log("\nCUSTOMER MATCH COMPARISON");
console.log("-------------------------");

console.table(
  historicalClientIds.map((clientId) => {
    const matches = [
      ...(customerMatches.get(clientId) ?? new Set()),
    ];

    return {
      boulevardClientId: clientId,
      matchedCustomerCount: matches.length,
      customerId: matches.length === 1 ? matches[0] : null,
      status:
        matches.length === 1
          ? "MATCHED"
          : matches.length > 1
            ? "CONFLICT — REVIEW"
            : "NO MATCH — REVIEW",
    };
  })
);
const orderSummaries = new Map();

for (const row of transactions) {
  const orderId = normalizeBoulevardId(row["Order ID"], "Order");

  if (!orderSummaries.has(orderId)) {
    const dateText = row["Order date"]?.trim();
    const parsedDate = dateText ? new Date(dateText) : null;

    const validDate =
      parsedDate && !Number.isNaN(parsedDate.getTime());

    const dateOnly = validDate
      ? parsedDate.toISOString().slice(0, 10)
      : null;

    orderSummaries.set(orderId, {
      orderNumber: row["Order number"],
      orderDate: dateOnly,
      source:
        dateOnly && dateOnly < "2026-04-22"
          ? "Pre-Boulevard / likely Vagaro"
          : "Boulevard period",
      alreadyImported: existingOrderIds.has(orderId),
    });
  }
}

console.log("\nHISTORICAL ORDER DATE REVIEW");
console.log("----------------------------");
console.table([...orderSummaries.values()]);
function dollarsToCents(value) {
  const text = String(value ?? "").trim();

  if (!text) return null;

  const cleaned = text.replace(/[$,\s]/g, "");

  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid monetary value: ${text}`);
  }

  const negative = cleaned.startsWith("-");
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [dollars, cents = ""] = unsigned.split(".");

  const amount =
    Number(dollars) * 100 + Number(cents.padEnd(2, "0"));

  if (!Number.isSafeInteger(amount)) {
    throw new Error(`Monetary value exceeds safe integer range: ${text}`);
  }

  return negative ? -amount : amount;
}

const financialFields = [
  "Sale amount",
  "Discount amount",
  "Voucher adjustment",
  "Net amount",
  "Sales tax",
  "Total collected",
  "Refund amount",
  "Fee amount",
];

const financialErrors = [];

for (const [index, row] of transactions.entries()) {
  for (const field of financialFields) {
    try {
      dollarsToCents(row[field]);
    } catch (error) {
      financialErrors.push({
        row: index + 1,
        field,
        error: error.message,
      });
    }
  }
}

console.log("\nFINANCIAL VALIDATION");
console.log("--------------------");
console.log("Transaction rows checked:", transactions.length);
console.log("Financial fields checked:", financialFields.length);
console.log("Invalid monetary values:", financialErrors.length);

if (financialErrors.length > 0) {
  console.table(financialErrors);
}

console.log("\nSample financial conversion:");
console.log({
  saleAmountCents: dollarsToCents(transactions[0]["Sale amount"]),
  discountAmountCents: dollarsToCents(transactions[0]["Discount amount"]),
  netAmountCents: dollarsToCents(transactions[0]["Net amount"]),
  refundAmountCents: dollarsToCents(transactions[0]["Refund amount"]),
});
function classifyHistoricalItem(type) {
  const value = String(type ?? "").trim().toLowerCase();

  if (value === "service") return "service";
  if (value === "product") return "product";
  if (value.startsWith("membership")) return "membership";
  if (value === "gift card") return "gift_card";
if (value === "gratuity") return "gratuity";
  return null;
}

const newTransactionRows = transactions.filter((row) => {
  const orderId = normalizeBoulevardId(row["Order ID"], "Order");
  return !existingOrderIds.has(orderId);
});

const classificationCounts = {};
const unsupportedItems = [];

for (const row of newTransactionRows) {
  const originalType = row["Item type"]?.trim() || "Unknown";
  const mappedType = classifyHistoricalItem(originalType);

  classificationCounts[originalType] =
    (classificationCounts[originalType] || 0) + 1;

  if (!mappedType) {
    unsupportedItems.push({
      orderNumber: row["Order number"],
      originalType,
      itemName: row["Item name"] || null,
    });
  }
}

console.log("\nHISTORICAL ITEM CLASSIFICATION");
console.log("------------------------------");
console.log("New transaction rows:", newTransactionRows.length);
console.table(classificationCounts);
console.log("Unsupported items:", unsupportedItems.length);

if (unsupportedItems.length) {
  console.table(unsupportedItems);
}
const refundRows = newTransactionRows.filter((row) => {
  return dollarsToCents(row["Refund amount"]) !== 0;
});

console.log("\nHISTORICAL REFUND REVIEW");
console.log("------------------------");
console.log("New transaction rows:", newTransactionRows.length);
console.log("Rows with nonzero refunds:", refundRows.length);

console.table(
  refundRows.map((row) => ({
    orderNumber: row["Order number"],
    orderDate: row["Order date"],
    itemType: row["Item type"],
    saleAmountCents: dollarsToCents(row["Sale amount"]),
    refundAmountCents: dollarsToCents(row["Refund amount"]),
  }))
);
const lineIds = new Set();
const duplicateLineIds = [];

for (const row of newTransactionRows) {
  const orderId = normalizeBoulevardId(row["Order ID"], "Order");
  const lineId = String(row["Line item ID"] ?? "").trim();
  const key = `${orderId}:${lineId}`;

  if (lineIds.has(key)) {
    duplicateLineIds.push({
      orderNumber: row["Order number"],
      lineId,
    });
  } else {
    lineIds.add(key);
  }
}

console.log("\nHISTORICAL LINE ITEM VALIDATION");
console.log("-------------------------------");
console.log("New transaction rows:", newTransactionRows.length);
console.log("Unique order/line combinations:", lineIds.size);
console.log("Duplicate line items:", duplicateLineIds.length);

if (duplicateLineIds.length > 0) {
  console.table(duplicateLineIds);
}
const APPROVED_MULTI_CLIENT_ORDERS = new Set([
  "2789",
  "2846",
  "2861",
  "2863",
  "2946",
  "2999",
  "3049",
  "3111",
]);
const APPROVED_WALK_IN_ORDERS = new Set([
  "2744",
  "2761",
  "2790",
  "2808",
  "2848",
  "2858",
  "2882",
  "2894",
  "2936",
  "2972",
  "2973",
  "2974",
  "2975",
  "2989",
  "3021",
  "3033",
  "3072",
  "3147",
]);
const EXPECTED_WALK_IN_LINE_ITEMS = newTransactionRows.filter(
  (row) =>
    APPROVED_WALK_IN_ORDERS.has(String(row["Order number"]))
).length;

console.log(
  "Approved walk-in line items:",
  EXPECTED_WALK_IN_LINE_ITEMS
);
const WALK_IN_GUEST_CUSTOMER_ID =
  "ee7cbe43-4ebe-4bff-8e46-ba2061d1b907";
const importPreview = [];

for (const [orderId, summary] of orderSummaries) {
  if (existingOrderIds.has(orderId)) continue;

  const orderRows = newTransactionRows.filter(
    (row) =>
      normalizeBoulevardId(row["Order ID"], "Order") === orderId
  );

  const clientIds = [
    ...new Set(
      orderRows.map((row) =>
        normalizeBoulevardId(row["Client ID"], "Client")
      )
    ),
  ];

  const matches =
    clientIds.length === 1
      ? [...(customerMatches.get(clientIds[0]) ?? new Set())]
      : [];
      const approvedMultiClient =
  APPROVED_MULTI_CLIENT_ORDERS.has(String(summary.orderNumber)) &&
  clientIds.length === 2 &&
  clientIds.every(
    (clientId) =>
      clientId !== null &&
      (customerMatches.get(clientId)?.size ?? 0) === 1
  );
  const approvedWalkIn =
  APPROVED_WALK_IN_ORDERS.has(String(summary.orderNumber)) &&
  clientIds.length === 1 &&
  clientIds[0] === null &&
  orderRows.every(
    (row) =>
      !String(row["Client ID"] ?? "").trim() &&
      !String(row["Client first name"] ?? "").trim() &&
      !String(row["Client last name"] ?? "").trim() &&
      !String(row["Client email"] ?? "").trim() &&
      !String(row["Client mobile"] ?? "").trim()
  );
const reviewReason =
  approvedMultiClient || approvedWalkIn
    ? null
    : clientIds.length !== 1
      ? "INVALID_CLIENT_ID_COUNT"
      : matches.length === 0
        ? "CUSTOMER_NOT_MATCHED"
        : matches.length > 1
          ? "MULTIPLE_CUSTOMER_MATCHES"
          : null;
  importPreview.push({
    orderNumber: summary.orderNumber,
    reviewReason,
    orderDate: summary.orderDate,
    customerId: approvedWalkIn
  ? WALK_IN_GUEST_CUSTOMER_ID
  : matches.length === 1
    ? matches[0]
    : null,
    lineItems: orderRows.length,
    status:
  approvedMultiClient ||
  approvedWalkIn ||
  (clientIds.length === 1 && matches.length === 1)
    ? "READY"
    : "REVIEW",
  });
}

console.log("\nHISTORICAL IMPORT PREVIEW");
console.log("-------------------------");
console.table(importPreview);
const reviewCounts = {};

for (const order of importPreview) {
  if (order.status !== "REVIEW") continue;

  reviewCounts[order.reviewReason] =
    (reviewCounts[order.reviewReason] ?? 0) + 1;
}

console.log("\nCUSTOMER MATCHING REVIEW");
console.table(reviewCounts);
const existingEmails = new Set(
  (freshCustomers ?? [])
    .map((customer) => customer.email?.trim().toLowerCase())
    .filter(Boolean)
);

const unmatchedClients = new Map();

for (const row of newTransactionRows) {
  const clientId = normalizeBoulevardId(row["Client ID"], "Client");

  if (!clientId) continue;
  if ((customerMatches.get(clientId)?.size ?? 0) !== 0) continue;

  const email = row["Client email"]?.trim().toLowerCase() || null;

  if (!unmatchedClients.has(clientId)) {
    unmatchedClients.set(clientId, new Set());
  }

  if (email) {
    unmatchedClients.get(clientId).add(email);
  }
}

let emailMatches = 0;
let noEmailMatches = 0;
let conflictingEmails = 0;

for (const emails of unmatchedClients.values()) {
  if (emails.size > 1) {
    conflictingEmails++;
  } else if ([...emails].some((email) => existingEmails.has(email))) {
    emailMatches++;
  } else {
    noEmailMatches++;
  }
}

console.log("\nUNMATCHED CUSTOMER EMAIL COMPARISON");
console.log("Unmatched Boulevard clients:", unmatchedClients.size);
console.log("Email matches with Fresh Desk:", emailMatches);
console.log("No email match:", noEmailMatches);
console.log("Conflicting emails:", conflictingEmails);
const reviewClientIds = new Set(
  newTransactionRows
    .filter((row) =>
      importPreview.some(
        (order) =>
          order.reviewReason === "CUSTOMER_NOT_MATCHED" &&
          order.orderNumber === row["Order number"]
      )
    )
    .map((row) => normalizeBoulevardId(row["Client ID"], "Client"))
    .filter(Boolean)
);
const clientsMissingNames = new Set();

for (const row of newTransactionRows) {
  const clientId = normalizeBoulevardId(row["Client ID"], "Client");

  if (!reviewClientIds.has(clientId)) continue;

  const firstName = row["Client first name"]?.trim();
  const lastName = row["Client last name"]?.trim();

  if (!firstName || !lastName) {
    clientsMissingNames.add(clientId);
  }
}

console.log(
  "Unmatched clients with incomplete names:",
  clientsMissingNames.size
);
const additionalClientIds = [...unmatchedClients.keys()].filter(
  (id) => !reviewClientIds.has(id)
);

console.log("Clients outside unmatched-order group:", additionalClientIds.length);
const additionalClientSet = new Set(additionalClientIds);

const additionalOrderReasons = {};

for (const order of importPreview) {
  const hasAdditionalClient = newTransactionRows.some(
    (row) =>
      row["Order number"] === order.orderNumber &&
      additionalClientSet.has(
        normalizeBoulevardId(row["Client ID"], "Client")
      )
  );

  if (!hasAdditionalClient) continue;

  const reason = order.reviewReason ?? order.status;

  additionalOrderReasons[reason] =
    (additionalOrderReasons[reason] ?? 0) + 1;
}

console.log("\nADDITIONAL CLIENT REVIEW CATEGORIES");
console.table(additionalOrderReasons);
console.log(
  "Orders ready:",
  importPreview.filter((order) => order.status === "READY").length
);
const unmatchedOrderIds = new Set(
  importPreview
    .filter((order) => order.reviewReason === "CUSTOMER_NOT_MATCHED")
    .map((order) => order.orderNumber)
);

const unmatchedClientIds = new Set(
  newTransactionRows
    .filter((row) => unmatchedOrderIds.has(row["Order number"]))
    .map((row) => normalizeBoulevardId(row["Client ID"], "Client"))
    .filter(Boolean)
);

console.log("\nMISSING CUSTOMER PROFILE SUMMARY");
console.log("Unmatched orders:", unmatchedOrderIds.size);
console.log("Distinct Boulevard clients:", unmatchedClientIds.size);
const bulkCustomerIds = [...unmatchedClientIds]
  .filter((clientId) => clientId !==
    "urn:blvd:Client:025959ab-17b0-4a30-9d1c-904850d46815")
  .sort();

console.log("\nBULK CUSTOMER IMPORT PREVIEW");
console.log("Customers eligible for review:", bulkCustomerIds.length);
console.log("Bulk customer import enabled:", BULK_CUSTOMER_IMPORT_ENABLED);
const testClientId = [...unmatchedClientIds].sort()[0];

const testClient = transactions.find(
  (row) =>
    normalizeBoulevardId(row["Client ID"], "Client") === testClientId
);
const bulkCustomerRecords = bulkCustomerIds.map((clientId) => {
  const row = transactions.find(
    (item) =>
      normalizeBoulevardId(item["Client ID"], "Client") === clientId
  );

  return {
    clientId,
    firstName: row?.["Client first name"]?.trim() || null,
    lastName: row?.["Client last name"]?.trim() || null,
    email: row?.["Client email"]?.trim().toLowerCase() || null,
    phone: row?.["Client mobile"]?.trim() || null,
  };
});

console.log(
  "Bulk customers missing names:",
  bulkCustomerRecords.filter(
    (customer) => !customer.firstName || !customer.lastName
  ).length
);
const bulkEmails = bulkCustomerRecords
  .map((customer) => customer.email)
  .filter(Boolean);

const duplicateBulkEmails =
  bulkEmails.length - new Set(bulkEmails).size;

const existingEmailConflicts = bulkEmails.filter(
  (email) => existingEmails.has(email)
);
const existingIdentityConflicts = bulkCustomerRecords.filter(
  (customer) =>
    (customerMatches.get(customer.clientId)?.size ?? 0) > 0
);

console.log(
  "Existing Boulevard identity conflicts:",
  existingIdentityConflicts.length
);
if (BULK_CUSTOMER_IMPORT_ENABLED) {
  if (
    bulkCustomerRecords.length !== 89 ||
    bulkCustomerRecords.some(
      (customer) => !customer.firstName || !customer.lastName
    ) ||
    duplicateBulkEmails !== 0 ||
    existingEmailConflicts.length !== 0 ||
    existingIdentityConflicts.length !== 0

  ) {
    throw new Error(
      "Bulk customer validation failed. Import stopped."
    );
  }

    console.log("Bulk customer safety checks passed.");

  const customerBatch = bulkCustomerRecords.slice(
    0,
    BULK_CUSTOMER_BATCH_SIZE
  );

  console.log("Bulk customer batch size:", customerBatch.length);
  console.log(
    "Customers remaining after batch:",
    bulkCustomerRecords.length - customerBatch.length
  );
  for (const customer of customerBatch) {
  const { data, error } = await supabase.rpc(
    "create_historical_boulevard_customer",
    {
      p_business_id: FRESH_BUSINESS_ID,
      p_boulevard_client_id: customer.clientId,
      p_first_name: customer.firstName,
      p_last_name: customer.lastName,
      p_email: customer.email,
      p_phone: customer.phone,
    }
  );

  if (error) {
    throw new Error(`Bulk customer import failed: ${error.message}`);
  }

  console.log("Created customer UUID:", data);
}
}
console.log("Duplicate emails within bulk:", duplicateBulkEmails);
console.log("Emails already in Fresh Desk:", existingEmailConflicts.length);
console.log("\nSINGLE CUSTOMER TEST CANDIDATE");
console.log({
  boulevardClientId: testClientId,
  firstName: testClient?.["Client first name"],
  lastName: testClient?.["Client last name"],
  email: testClient?.["Client email"] ? "[present]" : "[missing]",
  phone: testClient?.["Client mobile"] ? "[present]" : "[missing]",
});
const testEmail = testClient?.["Client email"]
  ?.trim()
  .toLowerCase();

console.log(
  "Test customer email already exists:",
  testEmail ? existingEmails.has(testEmail) : "EMAIL_MISSING"
);
if (CUSTOMER_IMPORT_ENABLED) {
      if (
    testClientId !==
    "urn:blvd:Client:025959ab-17b0-4a30-9d1c-904850d46815"
  ) {
    throw new Error("Unexpected customer selected. Import stopped.");
  }
  if (!testClient || !testEmail || existingEmails.has(testEmail)) {
    throw new Error("Test customer failed eligibility checks");
  }

  const { data, error } = await supabase.rpc(
    "create_historical_boulevard_customer",
    {
      p_business_id: FRESH_BUSINESS_ID,
      p_boulevard_client_id: testClientId,
      p_first_name: testClient["Client first name"].trim(),
      p_last_name: testClient["Client last name"].trim(),
      p_email: testEmail,
      p_phone: testClient["Client mobile"]?.trim() || null,
    }
  );

  if (error) throw new Error(`Customer import failed: ${error.message}`);

  console.log("Created test customer UUID:", data);
}
console.log(
  "Orders requiring review:",
  importPreview.filter((order) => order.status === "REVIEW").length
);
console.log("\nHISTORICAL PRICING REVIEW");
console.log("-------------------------");

console.table(
  newTransactionRows.map((row) => ({
    order: row["Order number"],
    type: row["Item type"],
    qty: row["Item quantity"],
    listPrice: row["Item list price"],
    sale: row["Sale amount"],
    discount: row["Discount amount"],
    net: row["Net amount"],
  }))
);
const financialMismatches = [];

for (const row of newTransactionRows) {
  const sale = dollarsToCents(row["Sale amount"]) ?? 0;
const discount = dollarsToCents(row["Discount amount"]) ?? 0;
const voucher = dollarsToCents(row["Voucher adjustment"]) ?? 0;
const refund = dollarsToCents(row["Refund amount"]) ?? 0;

const itemType = String(row["Item type"] ?? "").trim().toLowerCase();

const net =
  itemType === "gratuity"
    ? sale
    : dollarsToCents(row["Net amount"]) ?? 0;

const calculatedNet =
  itemType === "gratuity"
    ? sale
    : sale + discount + voucher + refund;
  if (calculatedNet !== net) {
    financialMismatches.push({
      orderNumber: row["Order number"],
      itemType: row["Item type"],
      calculatedNet,
      reportedNet: net,
      difference: calculatedNet - net,
    });
  }
}

console.log("\nHISTORICAL FINANCIAL RECONCILIATION");
console.log("-----------------------------------");
console.log("Line items checked:", newTransactionRows.length);
console.log("Financial mismatches:", financialMismatches.length);
console.log("\nGIFT CARD FINANCIAL MISMATCH");

console.table(
  newTransactionRows
    .filter((row) =>
      financialMismatches.some(
        (mismatch) =>
          mismatch.orderNumber === row["Order number"] &&
          mismatch.itemType === "Gift Card"
      )
    )
    .map((row) => ({
      order: row["Order number"],
      saleType: row["Sale type"],
      quantity: row["Item quantity"],
      saleAmount: row["Sale amount"],
      discount: row["Discount amount"],
      voucherAdjustment: row["Voucher adjustment"],
      refundAmount: row["Refund amount"],
      netAmount: row["Net amount"],
    }))
);
if (financialMismatches.length > 0) {
  console.table(financialMismatches);
}
const historicalOrderPayloads = importPreview
  .filter((order) => order.status === "READY")
  .map((order) => {
    const row = newTransactionRows.find(
      (item) => item["Order number"] === order.orderNumber
    );

    const orderId = normalizeBoulevardId(row["Order ID"], "Order");
    const clientId = normalizeBoulevardId(row["Client ID"], "Client");

    const originalDate = order.orderDate;

if (
  !originalDate ||
  !/^\d{4}-\d{2}-\d{2}$/.test(originalDate)
) {
  throw new Error(`Invalid date for order #${order.orderNumber}`);
}

    const isMultiClientOrder =
  APPROVED_MULTI_CLIENT_ORDERS.has(String(order.orderNumber));

return {
  business_id: FRESH_BUSINESS_ID,
  customer_id: isMultiClientOrder ? null : order.customerId,
  boulevard_order_id: orderId,
  boulevard_order_number: order.orderNumber,
  boulevard_client_id: isMultiClientOrder ? null : clientId,
      customer_email: isMultiClientOrder
  ? null
  : row["Client email"]?.trim() || null,
customer_first_name: isMultiClientOrder
  ? null
  : row["Client first name"]?.trim() || null,
customer_last_name: isMultiClientOrder
  ? null
  : row["Client last name"]?.trim() || null,
customer_phone: isMultiClientOrder
  ? null
  : row["Client mobile"]?.trim() || null,
      location_id: normalizeBoulevardId(row["Location ID"], "Location"),
      location_name: row["Location name"]?.trim() || null,
      historical_order_date: originalDate,
        completed_at: null,
    };
  });

console.log("\nHISTORICAL ORDER PAYLOAD PREVIEW");
console.log("--------------------------------");
console.log("Prepared orders:", historicalOrderPayloads.length);
console.log(
  "Previously imported orders excluded from payload:",
  existingOrderIds.size
);
console.log(
  "Previously imported orders excluded from payload:",
  existingOrderIds.size
);
const payloadOrderIds = historicalOrderPayloads.map(
  (order) => order.boulevard_order_id
);

const duplicateHistoricalOrderIds =
 payloadOrderIds.length - new Set(payloadOrderIds).size;

console.log(
  "Duplicate historical order IDs:",
  duplicateHistoricalOrderIds
);

if (duplicateHistoricalOrderIds !== 0) {
  throw new Error("Duplicate historical order IDs. Import stopped.");
}
const invalidWalkInAssignments = historicalOrderPayloads.filter(
  (order) =>
    order.customer_id !== WALK_IN_GUEST_CUSTOMER_ID ||
    order.boulevard_client_id !== null
);

console.log(
  "Invalid walk-in customer assignments:",
  invalidWalkInAssignments.length
);

if (invalidWalkInAssignments.length > 0) {
  throw new Error(
    "Walk-in customer assignment validation failed. Import blocked."
  );
}
console.table(
  historicalOrderPayloads.map((order) => ({
    orderNumber: order.boulevard_order_number,
    historicalDate: order.historical_order_date,
    completedAt: order.completed_at,
    customerMatched: Boolean(order.customer_id),
    boulevardIdPresent: Boolean(order.boulevard_order_id),
    locationPresent: Boolean(order.location_name),
  }))
);
const readyOrderNumbers = new Set(
  historicalOrderPayloads.map(
    (order) => order.boulevard_order_number
  )
);

const historicalLineItemPayloads = newTransactionRows
  .filter((row) => readyOrderNumbers.has(row["Order number"]))
  .map((row) => {
  const quantity = Number(row["Item quantity"]);
const saleType = String(row["Sale type"] ?? "").trim();

const validQuantity =
  Number.isSafeInteger(quantity) &&
  (
    (saleType === "Sale" && quantity > 0) ||
    (saleType === "Amendment (Increase)" && quantity > 0) ||
    (saleType === "Amendment (Decrease)" && quantity < 0) ||
    (saleType === "Refund" && quantity < 0)
  );

if (!validQuantity) {
  throw new Error(
    `Invalid quantity ${quantity} for ${saleType} on order #${row["Order number"]}`
  );
}

  const itemType = classifyHistoricalItem(row["Item type"]);

  if (!itemType) {
    console.log("UNSUPPORTED ITEM DETAILS", {
  orderNumber: row["Order number"],
  itemType: row["Item type"],
  itemName: row["Item name"],
  saleType: row["Sale type"],
  itemCategory: row["Item category"],
});

throw new Error(`Unsupported item type on order #${row["Order number"]}`);
  }

  const lineClientId = normalizeBoulevardId(
  row["Client ID"],
  "Client"
);

const lineCustomerMatches = lineClientId
  ? [...(customerMatches.get(lineClientId) ?? new Set())]
  : [];

return {
  source_order_id: normalizeBoulevardId(row["Order ID"], "Order"),
  boulevard_line_id: String(row["Line item ID"]).trim(),
  boulevard_client_id: lineClientId,
  customer_id:
  APPROVED_WALK_IN_ORDERS.has(String(row["Order number"])) &&
  lineClientId === null
    ? WALK_IN_GUEST_CUSTOMER_ID
    : lineCustomerMatches.length === 1
      ? lineCustomerMatches[0]
      : null,
  item_type: itemType,
    sale_type: saleType,
    item_name:
  row["Item name"]?.trim() ||
  (itemType === "gift_card"
    ? "Gift Card"
    : itemType === "gratuity"
      ? "Gratuity"
      : null),
    quantity,
    initial_price: dollarsToCents(row["Item list price"]),
    current_price: dollarsToCents(
  saleType === "Refund"
    ? row["Refund amount"]
    : row["Sale amount"]
),
    initial_discount_amount: Math.abs(
      dollarsToCents(row["Discount amount"]) ?? 0
    ),
    current_discount_amount: Math.abs(
      dollarsToCents(row["Discount amount"]) ?? 0
    ),
    initial_subtotal: dollarsToCents(
  itemType === "gratuity"
    ? row["Sale amount"]
    : row["Net amount"]
),
current_subtotal: dollarsToCents(
  itemType === "gratuity"
    ? row["Sale amount"]
    : row["Net amount"]
),
    voucher_adjustment: dollarsToCents(row["Voucher adjustment"]),
    redeemed_voucher_value: dollarsToCents(row["Redeemed voucher value"]),
    voucher_redemption_type:
      row["Voucher redemption type"]?.trim() || null,
    net_amount_less_vouchers:
      dollarsToCents(row["Net amount (less vouchers)"]),
  };
});
const invalidWalkInLineItems = historicalLineItemPayloads.filter(
  (item) =>
    item.customer_id !== WALK_IN_GUEST_CUSTOMER_ID ||
    item.boulevard_client_id !== null
);

console.log(
  "Invalid walk-in line-item assignments:",
  invalidWalkInLineItems.length
);

if (invalidWalkInLineItems.length > 0) {
  throw new Error(
    "Walk-in line-item customer validation failed. Import blocked."
  );
}
const unexpectedHistoricalOrders = historicalOrderPayloads.filter(
  (order) =>
    !APPROVED_WALK_IN_ORDERS.has(
      String(order.boulevard_order_number)
    ) ||
    order.customer_id !== WALK_IN_GUEST_CUSTOMER_ID ||
    order.boulevard_client_id !== null
);

if (
  historicalOrderPayloads.length !== APPROVED_WALK_IN_ORDERS.size ||
  unexpectedHistoricalOrders.length > 0
) {
  throw new Error(
    "Historical import blocked: payload must contain exactly the 18 approved anonymous walk-in orders."
  );
}
console.log("\nHISTORICAL LINE ITEM PAYLOAD PREVIEW");
console.log("------------------------------------");
console.log("Prepared line items:", historicalLineItemPayloads.length);
const payloadLineIds = historicalLineItemPayloads.map(
  (item) => item.boulevard_line_id
);

const duplicatePayloadLineIds =
  payloadLineIds.length - new Set(payloadLineIds).size;

console.log(
  "Duplicate historical line-item IDs:",
  duplicatePayloadLineIds
);

if (duplicatePayloadLineIds !== 0) {
  throw new Error(
    "Duplicate historical line-item IDs. Import stopped."
  );
}
const ordersWithItems = new Set(
  historicalLineItemPayloads.map((item) => item.source_order_id)
);

const ordersMissingItems = historicalOrderPayloads.filter(
  (order) => !ordersWithItems.has(order.boulevard_order_id)
);

console.log(
  "Historical orders missing line items:",
  ordersMissingItems.length
);

if (ordersMissingItems.length !== 0) {
  throw new Error(
    "Some historical orders have no line items. Import stopped."
  );
}
if (
  historicalOrderPayloads.length !== APPROVED_WALK_IN_ORDERS.size ||
  historicalLineItemPayloads.length !== EXPECTED_WALK_IN_LINE_ITEMS
) {
  throw new Error(
    "Walk-in historical order payload count mismatch. Import stopped."
  );
}
console.table(
  historicalLineItemPayloads.map((item) => ({
    orderNumber: newTransactionRows.find(
      (row) =>
        normalizeBoulevardId(row["Order ID"], "Order") ===
        item.source_order_id
    )?.["Order number"],
    type: item.item_type,
    quantity: item.quantity,
    priceCents: item.current_price,
    discountCents: item.current_discount_amount,
    voucherCents: item.voucher_adjustment,
    subtotalCents: item.current_subtotal,
  }))
);
console.log("\nFINANCIAL VALIDATION");
console.log("--------------------");
console.log("Lines checked:", newTransactionRows.length);
console.log("Financial mismatches:", financialMismatches.length);
const mismatchGroups = new Map();

for (const mismatch of financialMismatches) {
  const row = newTransactionRows.find(
    (item) =>
      item["Order number"] === mismatch.orderNumber &&
      item["Item type"] === mismatch.itemType
  );

  const key = `${mismatch.itemType} | ${row?.["Sale type"] ?? "Unknown"}`;

  mismatchGroups.set(
    key,
    (mismatchGroups.get(key) ?? 0) + 1
  );
}

console.log("\nFINANCIAL MISMATCH BREAKDOWN");
console.table(
  [...mismatchGroups].map(([category, count]) => ({
    category,
    count,
  }))
);
if (
  financialMismatches.length > 0 ||
  historicalOrderPayloads.length !== APPROVED_WALK_IN_ORDERS.size ||
  historicalLineItemPayloads.length !== EXPECTED_WALK_IN_LINE_ITEMS
) {
  throw new Error(
    "Walk-in historical import validation failed. Import blocked."
  );
}
console.log("\nMISSING HISTORICAL ITEM NAMES");

console.table(
  newTransactionRows
    .filter((row) => !String(row["Item name"] ?? "").trim())
    .map((row) => ({
      orderNumber: row["Order number"],
      lineItemId: row["Line item ID"],
      itemType: row["Item type"],
      saleType: row["Sale type"],
    }))
);
const missingPayloadNames = historicalLineItemPayloads.filter(
  (item) => !item.item_name
);

console.log("\nITEM NAME VALIDATION");
console.log("Line items checked:", historicalLineItemPayloads.length);
console.log("Missing item names:", missingPayloadNames.length);

if (missingPayloadNames.length > 0) {
  throw new Error("Historical import blocked: missing item names.");
}
console.log("Historical import validation: PASSED");

const itemsByOrderId = new Map();

for (const item of historicalLineItemPayloads) {
  const orderId = item.source_order_id;

  if (!itemsByOrderId.has(orderId)) {
    itemsByOrderId.set(orderId, []);
  }

  itemsByOrderId.get(orderId).push(item);
}
const assignedItemCount = historicalOrderPayloads.reduce(
  (total, order) =>
    total + (itemsByOrderId.get(order.boulevard_order_id)?.length ?? 0),
  0
);

if (assignedItemCount !== historicalLineItemPayloads.length) {
  throw new Error(
    `Batch integrity failed: ${assignedItemCount} of ${historicalLineItemPayloads.length} line items assigned.`
  );
}

console.log("Batch integrity: PASSED");
console.log("Line items assigned:", assignedItemCount);
if (!IMPORT_ENABLED) {
  console.log("IMPORT LOCKED: Dry-run mode only.");
  console.log("\nNo database changes were made.");
  process.exit(0);
}
let totalInsertedOrders = 0;
let totalInsertedItems = 0;

for (
  let i = 0;
  i < historicalOrderPayloads.length;
  i += HISTORICAL_IMPORT_BATCH_SIZE
) {
  const batchOrders = historicalOrderPayloads.slice(
    i,
    i + HISTORICAL_IMPORT_BATCH_SIZE
  );

  const batchItems = batchOrders.flatMap(
    (order) => itemsByOrderId.get(order.boulevard_order_id) ?? []
  );

  if (batchItems.length === 0) {
    throw new Error(`Historical import batch ${i + 1} has no line items.`);
  }

  const batchNumber = Math.floor(i / HISTORICAL_IMPORT_BATCH_SIZE) + 1;

  console.log(`Importing historical batch ${batchNumber}...`);

  const { data: importResult, error: importError } = await supabase.rpc(
    "import_boulevard_historical_orders",
    {
      p_orders: batchOrders,
      p_items: batchItems,
    }
  );

  if (importError) {
    throw new Error(
      `Historical import failed on batch ${batchNumber}: ${importError.message}`
    );
  }

  totalInsertedOrders += importResult.inserted_orders;
  totalInsertedItems += importResult.inserted_items;

  console.log(
    `Batch ${batchNumber}: ${importResult.inserted_orders} orders, ${importResult.inserted_items} items inserted`
  );
}
if (
  totalInsertedOrders !== APPROVED_WALK_IN_ORDERS.size ||
  totalInsertedItems !== EXPECTED_WALK_IN_LINE_ITEMS
) {
  throw new Error(
    `Walk-in import count mismatch: ${totalInsertedOrders} orders and ${totalInsertedItems} line items inserted; expected ${APPROVED_WALK_IN_ORDERS.size} orders and ${EXPECTED_WALK_IN_LINE_ITEMS} line items. Verify database records before any retry.`
  );
}
console.log("\nHISTORICAL IMPORT RESULT");
console.log("------------------------");
console.log("Orders inserted:", totalInsertedOrders);
console.log("Line items inserted:", totalInsertedItems);
console.log("\nHistorical import completed.");
