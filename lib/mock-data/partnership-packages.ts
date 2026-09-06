export interface PartnershipPackage {
  id: string;
  name: string;
  isFeatured: boolean;
  orderVolume: string;
  paymentTerms: string;
  estimatedDiscount: string;
  logistics: string;
  deliveryTime: string;
}

export interface PackageGroup {
  id: string;
  title: string;
  subtitle: string;
  packages: PartnershipPackage[];
}

export const partnershipPackagesData: PackageGroup[] = [
  {
    id: "stage-1",
    title: "1-Bosqich",
    subtitle: "1-Bosqich: Boshlang'ich sinov davri (Nasiya: 40% avans + 60% nasiya 25 kungacha yoki 2 ta muvaffaqiyatli naqd sdelkadan keyin)",
    packages: [
      {
        id: "start",
        name: "START (Sinov partiyasi)",
        isFeatured: false,
        orderVolume: "1 Isuzugacha (Kichik hajm)",
        paymentTerms: "Faqat naqd to'lov",
        estimatedDiscount: "~15% gacha",
        logistics: "2% gacha qoplanadi",
        deliveryTime: "Kelishuv asosida",
      },
      {
        id: "optimal-naqd",
        name: "OPTIMAL NAQD",
        isFeatured: false,
        orderVolume: "1 Isuzu assortiment (10 tonna)",
        paymentTerms: "Naqd (1�7 kun ichida)",
        estimatedDiscount: "~15% aniq",
        logistics: "100% BEPUL (To'liq)",
        deliveryTime: "3 ish kuni",
      },
      {
        id: "optimal-nasiya",
        name: "OPTIMAL NASIYA",
        isFeatured: false,
        orderVolume: "1 Isuzu assortiment (10 tonna)",
        paymentTerms: "40% avans + 60% nasiya (25 kun)",
        estimatedDiscount: "~15% aniq",
        logistics: "2% yo'lkira qoplanadi",
        deliveryTime: "3 ish kuni",
      },
      {
        id: "premium-naqd",
        name: "PREMIUM NAQD",
        isFeatured: true,
        orderVolume: "1 Fura assortiment (Maksimal)",
        paymentTerms: "Naqd (1�7 kun ichida)",
        estimatedDiscount: "~20% gacha",
        logistics: "100% BEPUL (To'liq)",
        deliveryTime: "1 hafta ichida",
      },
      {
        id: "korporativ-nasiya",
        name: "KORPORATIV NASIYA",
        isFeatured: false,
        orderVolume: "1 Fura assortiment (Yirik hajm)",
        paymentTerms: "40% avans + 60% nasiya (25 kun)",
        estimatedDiscount: "~15% aniq",
        logistics: "2% yo'lkira qoplanadi",
        deliveryTime: "1 hafta ichida",
      }
    ]
  }
];
