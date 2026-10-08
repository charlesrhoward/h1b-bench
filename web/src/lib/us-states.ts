/** A U.S. state or territory as LCA worksites name it: postal code, Census FIPS code, name. */
export type UsState = { code: string; fips: string; name: string };

export const US_STATES: UsState[] = [
  { code: "AL", fips: "01", name: "Alabama" },
  { code: "AK", fips: "02", name: "Alaska" },
  { code: "AZ", fips: "04", name: "Arizona" },
  { code: "AR", fips: "05", name: "Arkansas" },
  { code: "CA", fips: "06", name: "California" },
  { code: "CO", fips: "08", name: "Colorado" },
  { code: "CT", fips: "09", name: "Connecticut" },
  { code: "DE", fips: "10", name: "Delaware" },
  { code: "DC", fips: "11", name: "District of Columbia" },
  { code: "FL", fips: "12", name: "Florida" },
  { code: "GA", fips: "13", name: "Georgia" },
  { code: "HI", fips: "15", name: "Hawaii" },
  { code: "ID", fips: "16", name: "Idaho" },
  { code: "IL", fips: "17", name: "Illinois" },
  { code: "IN", fips: "18", name: "Indiana" },
  { code: "IA", fips: "19", name: "Iowa" },
  { code: "KS", fips: "20", name: "Kansas" },
  { code: "KY", fips: "21", name: "Kentucky" },
  { code: "LA", fips: "22", name: "Louisiana" },
  { code: "ME", fips: "23", name: "Maine" },
  { code: "MD", fips: "24", name: "Maryland" },
  { code: "MA", fips: "25", name: "Massachusetts" },
  { code: "MI", fips: "26", name: "Michigan" },
  { code: "MN", fips: "27", name: "Minnesota" },
  { code: "MS", fips: "28", name: "Mississippi" },
  { code: "MO", fips: "29", name: "Missouri" },
  { code: "MT", fips: "30", name: "Montana" },
  { code: "NE", fips: "31", name: "Nebraska" },
  { code: "NV", fips: "32", name: "Nevada" },
  { code: "NH", fips: "33", name: "New Hampshire" },
  { code: "NJ", fips: "34", name: "New Jersey" },
  { code: "NM", fips: "35", name: "New Mexico" },
  { code: "NY", fips: "36", name: "New York" },
  { code: "NC", fips: "37", name: "North Carolina" },
  { code: "ND", fips: "38", name: "North Dakota" },
  { code: "OH", fips: "39", name: "Ohio" },
  { code: "OK", fips: "40", name: "Oklahoma" },
  { code: "OR", fips: "41", name: "Oregon" },
  { code: "PA", fips: "42", name: "Pennsylvania" },
  { code: "RI", fips: "44", name: "Rhode Island" },
  { code: "SC", fips: "45", name: "South Carolina" },
  { code: "SD", fips: "46", name: "South Dakota" },
  { code: "TN", fips: "47", name: "Tennessee" },
  { code: "TX", fips: "48", name: "Texas" },
  { code: "UT", fips: "49", name: "Utah" },
  { code: "VT", fips: "50", name: "Vermont" },
  { code: "VA", fips: "51", name: "Virginia" },
  { code: "WA", fips: "53", name: "Washington" },
  { code: "WV", fips: "54", name: "West Virginia" },
  { code: "WI", fips: "55", name: "Wisconsin" },
  { code: "WY", fips: "56", name: "Wyoming" },
  { code: "GU", fips: "66", name: "Guam" },
  { code: "MP", fips: "69", name: "Northern Mariana Islands" },
  { code: "PR", fips: "72", name: "Puerto Rico" },
  { code: "VI", fips: "78", name: "U.S. Virgin Islands" },
];

export const STATE_BY_CODE = new Map(US_STATES.map((s) => [s.code, s]));
export const STATE_BY_FIPS = new Map(US_STATES.map((s) => [s.fips, s]));

/** Display name for a postal code; unknown codes pass through unchanged. */
export function stateName(code: string): string {
  if (code === "US") return "United States";
  return STATE_BY_CODE.get(code)?.name ?? code;
}
