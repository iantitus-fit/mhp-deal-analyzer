// pipeline/config.js
// Scoring thresholds, KUB service area zips, and constants

export const KUB_ZIPS = new Set([
  ...range(37901, 37924),
  ...range(37927, 37932),
  37934, 37938, 37950,
  ...range(37995, 37998),
].map(String));

function range(start, end) {
  const result = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

export const THRESHOLDS = {
  MSA_POPULATION_MIN: 100_000,
  LOT_COUNT_MIN: 50,
  CAP_RATE_MIN: 0.10,
  CASH_ON_CASH_MIN: 0.20,
  SPREAD_MIN: 0.03,
  ASSUMED_INTEREST_RATE: 0.055,
  OCCUPANCY_MIN: 0.70,
  PRICE_PER_LOT_GOOD: 25_000,
  PRICE_PER_LOT_MAX: 50_000,
  UNDERVALUED_PER_LOT: 15_000,
  OWNERSHIP_YEARS_SIGNAL: 10,
  LOT_RENT_MULTIPLIER: 0.35,
  EXPENSE_RATIO: 0.70,
};

export const REQUIRED_FIELDS = ["name", "address", "city", "zip", "county"];

export const COLUMN_MAP = {
  park_name: "name",
  property_name: "name",
  site_name: "name",
  address: "address",
  street_address: "address",
  property_address: "address",
  city: "city",
  zip: "zip",
  zip_code: "zip",
  zipcode: "zip",
  postal_code: "zip",
  county: "county",
  state: "state",
  owner_name: "ownerName",
  owner: "ownerName",
  owner_mailing_address: "ownerMailingAddress",
  mailing_address: "ownerMailingAddress",
  owner_mailing_city: "ownerMailingCity",
  mailing_city: "ownerMailingCity",
  owner_mailing_state: "ownerMailingState",
  mailing_state: "ownerMailingState",
  owner_mailing_zip: "ownerMailingZip",
  mailing_zip: "ownerMailingZip",
  lot_count: "lotCount",
  lots: "lotCount",
  num_lots: "lotCount",
  units: "lotCount",
  assessed_value: "assessedValue",
  assessed: "assessedValue",
  total_assessed_value: "assessedValue",
  year_built: "yearBuilt",
  ownership_date: "ownershipDate",
  sale_date: "ownershipDate",
  last_sale_date: "ownershipDate",
  tax_status: "taxStatus",
  equity_percent: "equityPercent",
  equity: "equityPercent",
  mortgage_amount: "mortgageAmount",
  mortgage: "mortgageAmount",
  mortgage_balance: "mortgageAmount",
  utilities: "utilities",
};
