export interface CertificateItem {
  id: string;
  title: string;
  categoryLabel: string;
  certNumber: string;
  orgName: string;
  orgCode: string;
  issueDate: string;
  validUntil: string;
  standards: string[];
  scope: string;
  images: string[];
  qrCodeNumber: string;
}

export const CERTIFICATES: CertificateItem[] = [
  {
    id: "uztest-ppr",
    title: "PPR quvurlar muvofiqlik sertifikati",
    categoryLabel: "PPR Quvurlar",
    certNumber: "№ UZ.SMT.01.0103.________",
    orgName: "\"O'zbekiston ilmiy-sinov va sifat nazorati markazi\" DM",
    orgCode: "O'ZAK.MS.0103",
    issueDate: "22-aprel 2025-y.",
    validUntil: "22-aprel 2028-y.",
    standards: ["ГОСТ 32415-2013"],
    scope: "Sovuq suv uchun SDR6 PN20 (20-63 mm) va issiq suv uchun SDR6 PN25 (20-63 mm) bosimga bardoshli PPR quvurlari",
    images: ["/certificates/sertifikat-uztest-ppr.png"],
    qrCodeNumber: "1257867"
  },
  {
    id: "atl-main",
    title: "Fitinglar, kranlar va kanalizatsiya sertifikati (+Ilovalar)",
    categoryLabel: "Fiting & Kanalizatsiya",
    certNumber: "№ UZ.SMT-01-0057-260601",
    orgName: "\"Advanced Testing Laboratory\" MCHJ mahsulotlarni sertifikatlashtirish organi",
    orgCode: "O'ZAK.MS.0057",
    issueDate: "27-avgust 2026-y.",
    validUntil: "27-avgust 2029-y.",
    standards: ["ГОСТ 32415-2013", "ГОСТ 34292-2017", "ГОСТ 32414-2013", "ГОСТ 32412-2013", "ГОСТ 18599-2001"],
    scope: "Fitinglar, kranlar, 3-qatlamli PREMIUM kanalizatsiya quvurlari va PE-RT isitish quvurlari (Ilovadagi 33 ta mahsulot)",
    images: [
      "/certificates/sertifikat-atl-asosiy.png",
      "/certificates/sertifikat-atl-ilova-1.png",
      "/certificates/sertifikat-atl-ilova-2.png",
      "/certificates/sertifikat-atl-ilova-3.png"
    ],
    qrCodeNumber: "346439"
  }
];
