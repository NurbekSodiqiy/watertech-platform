export interface Objection {
  id: string;
  objection: string;
  realMeaning: string;
  answer1: string;
  answer2: string;
  badAnswer: string;
  linkedCase: string;
}

export const objections: Objection[] = [
  {
    id: "obj-1",
    objection: "[\"Narxingiz juda yuqori.\"]",
    realMeaning: "[Ular hali qiymat farqini ko'rmagan, yoki arzonroq raqobatchiga qiyoslamoqda.]",
    answer1: "[Egalik qilishning umumiy tannarxini qayta ko'rsatib beruvchi joy egallovchi javob.]",
    answer2: "[Quyi darajadagi variant bilan taqqoslashni taklif qiluvchi joy egallovchi javob.]",
    badAnswer: "[Narx bo'yicha juda tez chekinadigan javobning joy egallovchi namunasi.]",
    linkedCase: "[Amaliy holat — joy egallovchi]",
  },
  {
    id: "obj-2",
    objection: "[\"Biz allaqachon boshqa yetkazib beruvchi bilan ishlaymiz.\"]",
    realMeaning: "[Almashtirish xarajati / xavfdan qochish, sodiqlik emas.]",
    answer1: "[Kichik sinov buyurtmasini taklif qiluvchi joy egallovchi javob.]",
    answer2: "[Aniq xizmat kamchiligini ko'rsatib beruvchi joy egallovchi javob.]",
    badAnswer: "[Raqobatchini bevosita yomonlaydigan javobning joy egallovchi namunasi.]",
    linkedCase: "[Amaliy holat — joy egallovchi]",
  },
  {
    id: "obj-3",
    objection: "[\"Avval jamoam bilan maslahatlashishim kerak.\"]",
    realMeaning: "[Yoki haqiqiy ko'p tomonlama qaror jarayoni, yoki yumshoq rad javobi.]",
    answer1: "[Jamoa bilan birgalikdagi qo'ng'iroqni taklif qiluvchi joy egallovchi javob.]",
    answer2: "[Ichkariga uzatish uchun qisqa qo'llanma beruvchi joy egallovchi javob.]",
    badAnswer: "[Zudlik bilan qaror talab qilishning joy egallovchi namunasi.]",
    linkedCase: "[Amaliy holat — joy egallovchi]",
  },
  {
    id: "obj-4",
    objection: "[\"Yetkazib berish muddati juda uzoq.\"]",
    realMeaning: "[Loyiha muddati bosimi yoki oldingi kechikish bilan bog'liq yomon tajriba.]",
    answer1: "[Tezlashtirilgan variantlarni tavsiflovchi joy egallovchi javob.]",
    answer2: "[Qisman/bosqichma-bosqich yetkazib berish haqidagi joy egallovchi javob.]",
    badAnswer: "[Muddat bo'yicha ortiqcha va'da berishning joy egallovchi namunasi.]",
    linkedCase: "[Amaliy holat — joy egallovchi]",
  },
];
