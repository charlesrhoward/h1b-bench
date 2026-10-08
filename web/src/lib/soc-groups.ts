/** 2018 SOC major groups, keyed by the first two digits of a SOC code. */
export const SOC_MAJOR_GROUPS: Record<string, string> = {
  "11": "Management",
  "13": "Business and financial",
  "15": "Computer and mathematical",
  "17": "Architecture and engineering",
  "19": "Life, physical, and social science",
  "21": "Community and social service",
  "23": "Legal",
  "25": "Education and library",
  "27": "Arts, design, and media",
  "29": "Healthcare practitioners",
  "31": "Healthcare support",
  "33": "Protective service",
  "35": "Food preparation and serving",
  "37": "Building and grounds",
  "39": "Personal care and service",
  "41": "Sales",
  "43": "Office and administrative support",
  "45": "Farming, fishing, and forestry",
  "47": "Construction and extraction",
  "49": "Installation and repair",
  "51": "Production",
  "53": "Transportation",
};

/** Major group key ("15") for a SOC code such as "15-1252.00", or null when the code is missing. */
export function socMajorGroup(soc: string | null): string | null {
  const key = soc?.slice(0, 2);
  return key && key in SOC_MAJOR_GROUPS ? key : null;
}
