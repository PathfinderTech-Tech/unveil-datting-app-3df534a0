// ISO 3166-1 alpha-2 country list with continent + French display name.
// Used by the global LocationPicker and the discovery country filter.

export type Continent = "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA";

export type Country = {
  code: string;       // ISO alpha-2
  name: string;       // English display
  name_fr: string;    // French display
  continent: Continent;
  hasRegions?: boolean; // true → show optional region field with a curated list
};

export const CONTINENTS: { code: Continent; name: string; name_fr: string }[] = [
  { code: "AF", name: "Africa", name_fr: "Afrique" },
  { code: "EU", name: "Europe", name_fr: "Europe" },
  { code: "AS", name: "Asia", name_fr: "Asie" },
  { code: "NA", name: "North America", name_fr: "Amérique du Nord" },
  { code: "SA", name: "South America", name_fr: "Amérique du Sud" },
  { code: "OC", name: "Oceania", name_fr: "Océanie" },
  { code: "AN", name: "Antarctica", name_fr: "Antarctique" },
];

// Countries where a region/state field is genuinely useful. Everywhere else
// the region field is hidden in the LocationPicker.
const R = true;

export const COUNTRIES: Country[] = [
  { code: "AF", name: "Afghanistan", name_fr: "Afghanistan", continent: "AS" },
  { code: "AL", name: "Albania", name_fr: "Albanie", continent: "EU" },
  { code: "DZ", name: "Algeria", name_fr: "Algérie", continent: "AF" },
  { code: "AD", name: "Andorra", name_fr: "Andorre", continent: "EU" },
  { code: "AO", name: "Angola", name_fr: "Angola", continent: "AF" },
  { code: "AG", name: "Antigua and Barbuda", name_fr: "Antigua-et-Barbuda", continent: "NA" },
  { code: "AR", name: "Argentina", name_fr: "Argentine", continent: "SA", hasRegions: R },
  { code: "AM", name: "Armenia", name_fr: "Arménie", continent: "AS" },
  { code: "AU", name: "Australia", name_fr: "Australie", continent: "OC", hasRegions: R },
  { code: "AT", name: "Austria", name_fr: "Autriche", continent: "EU" },
  { code: "AZ", name: "Azerbaijan", name_fr: "Azerbaïdjan", continent: "AS" },
  { code: "BS", name: "Bahamas", name_fr: "Bahamas", continent: "NA" },
  { code: "BH", name: "Bahrain", name_fr: "Bahreïn", continent: "AS" },
  { code: "BD", name: "Bangladesh", name_fr: "Bangladesh", continent: "AS" },
  { code: "BB", name: "Barbados", name_fr: "Barbade", continent: "NA" },
  { code: "BY", name: "Belarus", name_fr: "Biélorussie", continent: "EU" },
  { code: "BE", name: "Belgium", name_fr: "Belgique", continent: "EU" },
  { code: "BZ", name: "Belize", name_fr: "Belize", continent: "NA" },
  { code: "BJ", name: "Benin", name_fr: "Bénin", continent: "AF" },
  { code: "BT", name: "Bhutan", name_fr: "Bhoutan", continent: "AS" },
  { code: "BO", name: "Bolivia", name_fr: "Bolivie", continent: "SA" },
  { code: "BA", name: "Bosnia and Herzegovina", name_fr: "Bosnie-Herzégovine", continent: "EU" },
  { code: "BW", name: "Botswana", name_fr: "Botswana", continent: "AF" },
  { code: "BR", name: "Brazil", name_fr: "Brésil", continent: "SA", hasRegions: R },
  { code: "BN", name: "Brunei", name_fr: "Brunei", continent: "AS" },
  { code: "BG", name: "Bulgaria", name_fr: "Bulgarie", continent: "EU" },
  { code: "BF", name: "Burkina Faso", name_fr: "Burkina Faso", continent: "AF" },
  { code: "BI", name: "Burundi", name_fr: "Burundi", continent: "AF" },
  { code: "KH", name: "Cambodia", name_fr: "Cambodge", continent: "AS" },
  { code: "CM", name: "Cameroon", name_fr: "Cameroun", continent: "AF" },
  { code: "CA", name: "Canada", name_fr: "Canada", continent: "NA", hasRegions: R },
  { code: "CV", name: "Cape Verde", name_fr: "Cap-Vert", continent: "AF" },
  { code: "CF", name: "Central African Republic", name_fr: "République centrafricaine", continent: "AF" },
  { code: "TD", name: "Chad", name_fr: "Tchad", continent: "AF" },
  { code: "CL", name: "Chile", name_fr: "Chili", continent: "SA" },
  { code: "CN", name: "China", name_fr: "Chine", continent: "AS" },
  { code: "CO", name: "Colombia", name_fr: "Colombie", continent: "SA" },
  { code: "KM", name: "Comoros", name_fr: "Comores", continent: "AF" },
  { code: "CG", name: "Congo (Brazzaville)", name_fr: "Congo (Brazzaville)", continent: "AF" },
  { code: "CD", name: "Congo (Kinshasa)", name_fr: "Congo (Kinshasa)", continent: "AF" },
  { code: "CR", name: "Costa Rica", name_fr: "Costa Rica", continent: "NA" },
  { code: "CI", name: "Côte d’Ivoire", name_fr: "Côte d’Ivoire", continent: "AF", hasRegions: R },
  { code: "HR", name: "Croatia", name_fr: "Croatie", continent: "EU" },
  { code: "CU", name: "Cuba", name_fr: "Cuba", continent: "NA" },
  { code: "CY", name: "Cyprus", name_fr: "Chypre", continent: "EU" },
  { code: "CZ", name: "Czechia", name_fr: "Tchéquie", continent: "EU" },
  { code: "DK", name: "Denmark", name_fr: "Danemark", continent: "EU" },
  { code: "DJ", name: "Djibouti", name_fr: "Djibouti", continent: "AF" },
  { code: "DM", name: "Dominica", name_fr: "Dominique", continent: "NA" },
  { code: "DO", name: "Dominican Republic", name_fr: "République dominicaine", continent: "NA" },
  { code: "EC", name: "Ecuador", name_fr: "Équateur", continent: "SA" },
  { code: "EG", name: "Egypt", name_fr: "Égypte", continent: "AF" },
  { code: "SV", name: "El Salvador", name_fr: "Salvador", continent: "NA" },
  { code: "GQ", name: "Equatorial Guinea", name_fr: "Guinée équatoriale", continent: "AF" },
  { code: "ER", name: "Eritrea", name_fr: "Érythrée", continent: "AF" },
  { code: "EE", name: "Estonia", name_fr: "Estonie", continent: "EU" },
  { code: "SZ", name: "Eswatini", name_fr: "Eswatini", continent: "AF" },
  { code: "ET", name: "Ethiopia", name_fr: "Éthiopie", continent: "AF" },
  { code: "FJ", name: "Fiji", name_fr: "Fidji", continent: "OC" },
  { code: "FI", name: "Finland", name_fr: "Finlande", continent: "EU" },
  { code: "FR", name: "France", name_fr: "France", continent: "EU", hasRegions: R },
  { code: "GA", name: "Gabon", name_fr: "Gabon", continent: "AF" },
  { code: "GM", name: "Gambia", name_fr: "Gambie", continent: "AF" },
  { code: "GE", name: "Georgia", name_fr: "Géorgie", continent: "AS" },
  { code: "DE", name: "Germany", name_fr: "Allemagne", continent: "EU", hasRegions: R },
  { code: "GH", name: "Ghana", name_fr: "Ghana", continent: "AF" },
  { code: "GR", name: "Greece", name_fr: "Grèce", continent: "EU" },
  { code: "GD", name: "Grenada", name_fr: "Grenade", continent: "NA" },
  { code: "GT", name: "Guatemala", name_fr: "Guatemala", continent: "NA" },
  { code: "GN", name: "Guinea", name_fr: "Guinée", continent: "AF" },
  { code: "GW", name: "Guinea-Bissau", name_fr: "Guinée-Bissau", continent: "AF" },
  { code: "GY", name: "Guyana", name_fr: "Guyana", continent: "SA" },
  { code: "HT", name: "Haiti", name_fr: "Haïti", continent: "NA" },
  { code: "HN", name: "Honduras", name_fr: "Honduras", continent: "NA" },
  { code: "HK", name: "Hong Kong", name_fr: "Hong Kong", continent: "AS" },
  { code: "HU", name: "Hungary", name_fr: "Hongrie", continent: "EU" },
  { code: "IS", name: "Iceland", name_fr: "Islande", continent: "EU" },
  { code: "IN", name: "India", name_fr: "Inde", continent: "AS", hasRegions: R },
  { code: "ID", name: "Indonesia", name_fr: "Indonésie", continent: "AS" },
  { code: "IR", name: "Iran", name_fr: "Iran", continent: "AS" },
  { code: "IQ", name: "Iraq", name_fr: "Irak", continent: "AS" },
  { code: "IE", name: "Ireland", name_fr: "Irlande", continent: "EU" },
  { code: "IL", name: "Israel", name_fr: "Israël", continent: "AS" },
  { code: "IT", name: "Italy", name_fr: "Italie", continent: "EU" },
  { code: "JM", name: "Jamaica", name_fr: "Jamaïque", continent: "NA" },
  { code: "JP", name: "Japan", name_fr: "Japon", continent: "AS" },
  { code: "JO", name: "Jordan", name_fr: "Jordanie", continent: "AS" },
  { code: "KZ", name: "Kazakhstan", name_fr: "Kazakhstan", continent: "AS" },
  { code: "KE", name: "Kenya", name_fr: "Kenya", continent: "AF" },
  { code: "KI", name: "Kiribati", name_fr: "Kiribati", continent: "OC" },
  { code: "KW", name: "Kuwait", name_fr: "Koweït", continent: "AS" },
  { code: "KG", name: "Kyrgyzstan", name_fr: "Kirghizistan", continent: "AS" },
  { code: "LA", name: "Laos", name_fr: "Laos", continent: "AS" },
  { code: "LV", name: "Latvia", name_fr: "Lettonie", continent: "EU" },
  { code: "LB", name: "Lebanon", name_fr: "Liban", continent: "AS" },
  { code: "LS", name: "Lesotho", name_fr: "Lesotho", continent: "AF" },
  { code: "LR", name: "Liberia", name_fr: "Libéria", continent: "AF" },
  { code: "LY", name: "Libya", name_fr: "Libye", continent: "AF" },
  { code: "LI", name: "Liechtenstein", name_fr: "Liechtenstein", continent: "EU" },
  { code: "LT", name: "Lithuania", name_fr: "Lituanie", continent: "EU" },
  { code: "LU", name: "Luxembourg", name_fr: "Luxembourg", continent: "EU" },
  { code: "MO", name: "Macao", name_fr: "Macao", continent: "AS" },
  { code: "MG", name: "Madagascar", name_fr: "Madagascar", continent: "AF" },
  { code: "MW", name: "Malawi", name_fr: "Malawi", continent: "AF" },
  { code: "MY", name: "Malaysia", name_fr: "Malaisie", continent: "AS" },
  { code: "MV", name: "Maldives", name_fr: "Maldives", continent: "AS" },
  { code: "ML", name: "Mali", name_fr: "Mali", continent: "AF" },
  { code: "MT", name: "Malta", name_fr: "Malte", continent: "EU" },
  { code: "MH", name: "Marshall Islands", name_fr: "Îles Marshall", continent: "OC" },
  { code: "MR", name: "Mauritania", name_fr: "Mauritanie", continent: "AF" },
  { code: "MU", name: "Mauritius", name_fr: "Maurice", continent: "AF" },
  { code: "MX", name: "Mexico", name_fr: "Mexique", continent: "NA", hasRegions: R },
  { code: "FM", name: "Micronesia", name_fr: "Micronésie", continent: "OC" },
  { code: "MD", name: "Moldova", name_fr: "Moldavie", continent: "EU" },
  { code: "MC", name: "Monaco", name_fr: "Monaco", continent: "EU" },
  { code: "MN", name: "Mongolia", name_fr: "Mongolie", continent: "AS" },
  { code: "ME", name: "Montenegro", name_fr: "Monténégro", continent: "EU" },
  { code: "MA", name: "Morocco", name_fr: "Maroc", continent: "AF" },
  { code: "MZ", name: "Mozambique", name_fr: "Mozambique", continent: "AF" },
  { code: "MM", name: "Myanmar", name_fr: "Myanmar", continent: "AS" },
  { code: "NA", name: "Namibia", name_fr: "Namibie", continent: "AF" },
  { code: "NR", name: "Nauru", name_fr: "Nauru", continent: "OC" },
  { code: "NP", name: "Nepal", name_fr: "Népal", continent: "AS" },
  { code: "NL", name: "Netherlands", name_fr: "Pays-Bas", continent: "EU" },
  { code: "NZ", name: "New Zealand", name_fr: "Nouvelle-Zélande", continent: "OC" },
  { code: "NI", name: "Nicaragua", name_fr: "Nicaragua", continent: "NA" },
  { code: "NE", name: "Niger", name_fr: "Niger", continent: "AF" },
  { code: "NG", name: "Nigeria", name_fr: "Nigéria", continent: "AF", hasRegions: R },
  { code: "KP", name: "North Korea", name_fr: "Corée du Nord", continent: "AS" },
  { code: "MK", name: "North Macedonia", name_fr: "Macédoine du Nord", continent: "EU" },
  { code: "NO", name: "Norway", name_fr: "Norvège", continent: "EU" },
  { code: "OM", name: "Oman", name_fr: "Oman", continent: "AS" },
  { code: "PK", name: "Pakistan", name_fr: "Pakistan", continent: "AS" },
  { code: "PW", name: "Palau", name_fr: "Palaos", continent: "OC" },
  { code: "PS", name: "Palestine", name_fr: "Palestine", continent: "AS" },
  { code: "PA", name: "Panama", name_fr: "Panama", continent: "NA" },
  { code: "PG", name: "Papua New Guinea", name_fr: "Papouasie-Nouvelle-Guinée", continent: "OC" },
  { code: "PY", name: "Paraguay", name_fr: "Paraguay", continent: "SA" },
  { code: "PE", name: "Peru", name_fr: "Pérou", continent: "SA" },
  { code: "PH", name: "Philippines", name_fr: "Philippines", continent: "AS" },
  { code: "PL", name: "Poland", name_fr: "Pologne", continent: "EU" },
  { code: "PT", name: "Portugal", name_fr: "Portugal", continent: "EU" },
  { code: "PR", name: "Puerto Rico", name_fr: "Porto Rico", continent: "NA" },
  { code: "QA", name: "Qatar", name_fr: "Qatar", continent: "AS" },
  { code: "RO", name: "Romania", name_fr: "Roumanie", continent: "EU" },
  { code: "RU", name: "Russia", name_fr: "Russie", continent: "EU" },
  { code: "RW", name: "Rwanda", name_fr: "Rwanda", continent: "AF" },
  { code: "WS", name: "Samoa", name_fr: "Samoa", continent: "OC" },
  { code: "SM", name: "San Marino", name_fr: "Saint-Marin", continent: "EU" },
  { code: "ST", name: "São Tomé and Príncipe", name_fr: "Sao Tomé-et-Principe", continent: "AF" },
  { code: "SA", name: "Saudi Arabia", name_fr: "Arabie saoudite", continent: "AS" },
  { code: "SN", name: "Senegal", name_fr: "Sénégal", continent: "AF" },
  { code: "RS", name: "Serbia", name_fr: "Serbie", continent: "EU" },
  { code: "SC", name: "Seychelles", name_fr: "Seychelles", continent: "AF" },
  { code: "SL", name: "Sierra Leone", name_fr: "Sierra Leone", continent: "AF" },
  { code: "SG", name: "Singapore", name_fr: "Singapour", continent: "AS" },
  { code: "SK", name: "Slovakia", name_fr: "Slovaquie", continent: "EU" },
  { code: "SI", name: "Slovenia", name_fr: "Slovénie", continent: "EU" },
  { code: "SB", name: "Solomon Islands", name_fr: "Îles Salomon", continent: "OC" },
  { code: "SO", name: "Somalia", name_fr: "Somalie", continent: "AF" },
  { code: "ZA", name: "South Africa", name_fr: "Afrique du Sud", continent: "AF", hasRegions: R },
  { code: "KR", name: "South Korea", name_fr: "Corée du Sud", continent: "AS" },
  { code: "SS", name: "South Sudan", name_fr: "Soudan du Sud", continent: "AF" },
  { code: "ES", name: "Spain", name_fr: "Espagne", continent: "EU" },
  { code: "LK", name: "Sri Lanka", name_fr: "Sri Lanka", continent: "AS" },
  { code: "SD", name: "Sudan", name_fr: "Soudan", continent: "AF" },
  { code: "SR", name: "Suriname", name_fr: "Suriname", continent: "SA" },
  { code: "SE", name: "Sweden", name_fr: "Suède", continent: "EU" },
  { code: "CH", name: "Switzerland", name_fr: "Suisse", continent: "EU" },
  { code: "SY", name: "Syria", name_fr: "Syrie", continent: "AS" },
  { code: "TW", name: "Taiwan", name_fr: "Taïwan", continent: "AS" },
  { code: "TJ", name: "Tajikistan", name_fr: "Tadjikistan", continent: "AS" },
  { code: "TZ", name: "Tanzania", name_fr: "Tanzanie", continent: "AF" },
  { code: "TH", name: "Thailand", name_fr: "Thaïlande", continent: "AS" },
  { code: "TL", name: "Timor-Leste", name_fr: "Timor oriental", continent: "AS" },
  { code: "TG", name: "Togo", name_fr: "Togo", continent: "AF" },
  { code: "TO", name: "Tonga", name_fr: "Tonga", continent: "OC" },
  { code: "TT", name: "Trinidad and Tobago", name_fr: "Trinité-et-Tobago", continent: "NA" },
  { code: "TN", name: "Tunisia", name_fr: "Tunisie", continent: "AF" },
  { code: "TR", name: "Türkiye", name_fr: "Turquie", continent: "AS" },
  { code: "TM", name: "Turkmenistan", name_fr: "Turkménistan", continent: "AS" },
  { code: "TV", name: "Tuvalu", name_fr: "Tuvalu", continent: "OC" },
  { code: "UG", name: "Uganda", name_fr: "Ouganda", continent: "AF" },
  { code: "UA", name: "Ukraine", name_fr: "Ukraine", continent: "EU" },
  { code: "AE", name: "United Arab Emirates", name_fr: "Émirats arabes unis", continent: "AS" },
  { code: "GB", name: "United Kingdom", name_fr: "Royaume-Uni", continent: "EU", hasRegions: R },
  { code: "US", name: "United States", name_fr: "États-Unis", continent: "NA", hasRegions: R },
  { code: "UY", name: "Uruguay", name_fr: "Uruguay", continent: "SA" },
  { code: "UZ", name: "Uzbekistan", name_fr: "Ouzbékistan", continent: "AS" },
  { code: "VU", name: "Vanuatu", name_fr: "Vanuatu", continent: "OC" },
  { code: "VA", name: "Vatican City", name_fr: "Vatican", continent: "EU" },
  { code: "VE", name: "Venezuela", name_fr: "Venezuela", continent: "SA" },
  { code: "VN", name: "Vietnam", name_fr: "Vietnam", continent: "AS" },
  { code: "YE", name: "Yemen", name_fr: "Yémen", continent: "AS" },
  { code: "ZM", name: "Zambia", name_fr: "Zambie", continent: "AF" },
  { code: "ZW", name: "Zimbabwe", name_fr: "Zimbabwe", continent: "AF" },
];

export const COUNTRY_BY_CODE: Record<string, Country> =
  Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

// Curated region/state lists for countries where it matters. Free-text
// fallback is still accepted server-side; users can type a region not listed.
export const REGIONS: Record<string, string[]> = {
  US: ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","Washington D.C."],
  CA: ["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador","Nova Scotia","Ontario","Prince Edward Island","Quebec","Saskatchewan","Northwest Territories","Nunavut","Yukon"],
  AU: ["New South Wales","Victoria","Queensland","Western Australia","South Australia","Tasmania","Australian Capital Territory","Northern Territory"],
  GB: ["England","Scotland","Wales","Northern Ireland","Greater London"],
  FR: ["Île-de-France","Auvergne-Rhône-Alpes","Provence-Alpes-Côte d’Azur","Nouvelle-Aquitaine","Occitanie","Hauts-de-France","Grand Est","Pays de la Loire","Bretagne","Normandie","Bourgogne-Franche-Comté","Centre-Val de Loire","Corse","Outre-mer"],
  DE: ["Baden-Württemberg","Bayern","Berlin","Brandenburg","Bremen","Hamburg","Hessen","Mecklenburg-Vorpommern","Niedersachsen","Nordrhein-Westfalen","Rheinland-Pfalz","Saarland","Sachsen","Sachsen-Anhalt","Schleswig-Holstein","Thüringen"],
  IN: ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh","Puducherry","Chandigarh"],
  BR: ["Acre","Alagoas","Amapá","Amazonas","Bahia","Ceará","Distrito Federal","Espírito Santo","Goiás","Maranhão","Mato Grosso","Mato Grosso do Sul","Minas Gerais","Pará","Paraíba","Paraná","Pernambuco","Piauí","Rio de Janeiro","Rio Grande do Norte","Rio Grande do Sul","Rondônia","Roraima","Santa Catarina","São Paulo","Sergipe","Tocantins"],
  NG: ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT (Abuja)","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"],
  ZA: ["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","North West","Northern Cape","Western Cape"],
  MX: ["Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua","Coahuila","Colima","CDMX","Durango","Guanajuato","Guerrero","Hidalgo","Jalisco","México","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"],
  AR: ["Buenos Aires","CABA","Catamarca","Chaco","Chubut","Córdoba","Corrientes","Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja","Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan","San Luis","Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego","Tucumán"],
  CI: ["Abidjan (District Autonome)","Yamoussoukro (District Autonome)","Bas-Sassandra","Comoé","Denguélé","Gôh-Djiboua","Lacs","Lagunes","Montagnes","Sassandra-Marahoué","Savanes","Vallée du Bandama","Woroba","Zanzan"],
};

/**
 * Best-effort browser country detection from the user's timezone. Returns
 * an ISO alpha-2 code or null. No network call; safe to run during render.
 */
export function detectCountryFromTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return null;
    // Use the Intl.Locale region tag where supported (Chrome 130+, Safari 18+).
    // Falls back to a small TZ→country map for the most common zones.
    const TZ_MAP: Record<string, string> = {
      "Africa/Abidjan": "CI", "Africa/Accra": "GH", "Africa/Algiers": "DZ",
      "Africa/Cairo": "EG", "Africa/Casablanca": "MA", "Africa/Dakar": "SN",
      "Africa/Johannesburg": "ZA", "Africa/Lagos": "NG", "Africa/Nairobi": "KE",
      "Africa/Tunis": "TN",
      "America/Argentina/Buenos_Aires": "AR", "America/Bogota": "CO",
      "America/Caracas": "VE", "America/Chicago": "US", "America/Denver": "US",
      "America/Halifax": "CA", "America/Lima": "PE", "America/Los_Angeles": "US",
      "America/Mexico_City": "MX", "America/New_York": "US", "America/Phoenix": "US",
      "America/Santiago": "CL", "America/Sao_Paulo": "BR", "America/Toronto": "CA",
      "America/Vancouver": "CA",
      "Asia/Bangkok": "TH", "Asia/Beirut": "LB", "Asia/Dubai": "AE",
      "Asia/Hong_Kong": "HK", "Asia/Jakarta": "ID", "Asia/Karachi": "PK",
      "Asia/Kolkata": "IN", "Asia/Manila": "PH", "Asia/Riyadh": "SA",
      "Asia/Seoul": "KR", "Asia/Shanghai": "CN", "Asia/Singapore": "SG",
      "Asia/Taipei": "TW", "Asia/Tehran": "IR", "Asia/Tokyo": "JP",
      "Australia/Melbourne": "AU", "Australia/Sydney": "AU",
      "Europe/Amsterdam": "NL", "Europe/Athens": "GR", "Europe/Berlin": "DE",
      "Europe/Brussels": "BE", "Europe/Bucharest": "RO", "Europe/Budapest": "HU",
      "Europe/Copenhagen": "DK", "Europe/Dublin": "IE", "Europe/Helsinki": "FI",
      "Europe/Istanbul": "TR", "Europe/Lisbon": "PT", "Europe/London": "GB",
      "Europe/Madrid": "ES", "Europe/Moscow": "RU", "Europe/Oslo": "NO",
      "Europe/Paris": "FR", "Europe/Prague": "CZ", "Europe/Rome": "IT",
      "Europe/Stockholm": "SE", "Europe/Vienna": "AT", "Europe/Warsaw": "PL",
      "Europe/Zurich": "CH",
      "Pacific/Auckland": "NZ",
    };
    return TZ_MAP[tz] ?? null;
  } catch {
    return null;
  }
}

// Match the existing list of country display-name strings back to a code
// (used for backfilling profiles that only have the old free-text `country`).
export function codeForName(name: string | null | undefined): string | null {
  if (!name) return null;
  const lower = name.trim().toLowerCase();
  for (const c of COUNTRIES) {
    if (c.name.toLowerCase() === lower || c.name_fr.toLowerCase() === lower) return c.code;
  }
  // Aliases used by the legacy list
  const ALIAS: Record<string, string> = {
    "uae": "AE", "uk": "GB", "usa": "US", "south korea": "KR",
  };
  return ALIAS[lower] ?? null;
}
