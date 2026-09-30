export interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  details: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  period: string;
  details?: string;
}

export interface MasterProfile {
  personal: {
    name: string;
    phone: string;
    email: string;
    address: string;
    birthDate: string;
  };
  education: EducationItem[];
  highSchool: {
    school: string;
    period: string;
    certificate: string;
  };
  experiences: ExperienceItem[];
  earlierExperiences: {
    title: string;
    year: string;
    description: string;
  }[];
  skills: {
    category: string;
    items: string[];
  }[];
  languages: {
    language: string;
    level: string;
    description: string;
  }[];
  drivingLicense: string;
}

export const MASTER_PROFILE: MasterProfile = {
  personal: {
    name: "Márki Gergely",
    phone: "+36 (30) 844 1720",
    email: "markigergely1@gmail.com",
    address: "1118 Budapest, Gombocz Z. u. 13.",
    birthDate: "2000. április 02."
  },
  education: [
    {
      institution: "Eötvös Loránd Tudományegyetem (ELTE)",
      degree: "Vezetés és szervezés mesterszak (MSc)",
      period: "2024 – 2026",
      details: "Szervezetfejlesztés, stratégiai menedzsment, vezetői döntéshozatal."
    },
    {
      institution: "Budapesti Műszaki és Gazdaságtudományi Egyetem (BME)",
      degree: "Gazdálkodási és menedzsment alapszak (BSc)",
      period: "2020 – 2024",
      details: "Vállalati pénzügyek, számvitel, kontrolling, NPV, mérleg és eredménykimutatás logikája, döntéselmélet."
    }
  ],
  highSchool: {
    school: "Toldy Ferenc Gimnázium",
    period: "2013 – 2019",
    certificate: "Érettségi bizonyítvány"
  },
  experiences: [
    {
      company: "Önálló Szoftverfejlesztési Projekt – Röplabda Adminisztrációs Rendszer",
      role: "Full-stack fejlesztő és termékfelelős",
      period: "2023 – jelenleg",
      details: [
        "Egy amatőr sportegyesület heti adminisztrációját automatizáló Progressive Web App (PWA) (Production: https://attendanceapp-473208.web.app).",
        "Frontend: Svelte 5 ($state, $derived reaktivitás), Vite, TypeScript, Tailwind CSS v4.",
        "Backend és infrastruktúra: Firebase Firestore (offline persistence, valós idejű szinkronizáció), Firebase Auth (Google OAuth, szerepkör-kezelés), Firebase Cloud Functions (Node.js 22, Gmail SMTP), Firebase Hosting.",
        "Megvalósított üzleti logika: Felhasználói és admin jogosultsági szintek kezelése, QR-kódos helyszíni jelenlét-regisztráció és jelenléti statisztikák.",
        "Pénzügyi modul: automatizált havi költségkalkuláció, PDF generálás (jspdf), Revolut CSV import és tranzakció-egyeztetés.",
        "Munkaszervezés: Feladatok követése, specifikáció és sprint-tervezés ClickUp rendszerben; verziókövetés és release kezelés Git/GitHub segítségével.",
        "AI-asszisztált tervezés és kódolás (Gemini API, prompt engineering, moduláris vibe-coding módszertan)."
      ]
    },
    {
      company: "Szabadúszó – Oktatás",
      role: "Matematika magántanár",
      period: "2024 – 2026",
      details: [
        "Általános és középiskolás tanulók felkészítése középiskolai felvételire és érettségire.",
        "Egyéni tantervek kidolgozása a mindenkori hivatalos vizsgakövetelmények analízisére építve.",
        "Saját összeállítású, differenciált szintfelmérő tesztek alkalmazása a kiinduló kompetenciák megállapítására.",
        "Összetett logikai és matematikai fogalmak strukturált átadása a tanulók egyéni igényeihez és tempójához igazítva."
      ]
    },
    {
      company: "BME Motorsport",
      role: "Marketing munkatárs",
      period: "2021",
      details: [
        "Tartalomkészítés és fiókkezelés: Facebook, Instagram és LinkedIn felületeken.",
        "A csapat hivatalos weboldalának tartalmi frissítése és karbantartása."
      ]
    },
    {
      company: "Vodafone Magyarország – Digital Engineering osztály",
      role: "Junior IT Elemző Gyakornok",
      period: "2020 – 2021",
      details: [
        "Belső felhasználói jogosultságok felmérése és kezelése Identity and Access Management (IAM) szoftver használatával új belépő kollégák és külsős kontraktorok számára.",
        "Disaster Recovery célú backup szoftver manuális teszteseteinek írása és végrehajtása leállási helyzetek kezelésére.",
        "Szoftveres változtatások és teszteredmények prezentálása magas beosztású, belső megrendelői vezetőknek képernyőmegosztásos demókon.",
        "Haladó szintű táblázatkezelés: Pivot táblák, FKERES/XKERES, feltételes logikák, makrók/VBA alkalmazása.",
        "Részlegek által elért KPI-ok és mérőszámok riportálása a közvetlen felettes felé.",
        "50 fős céges csapatépítő rendezvény megszervezése (helyszínek, szállás, programok, logisztika és költségvetés-tervezés)."
      ]
    }
  ],
  earlierExperiences: [
    {
      title: "Euro 2020 önkéntes",
      year: "2021",
      description: "Nemzetközi szurkolók eligazítása, idegennyelvű kommunikáció és csapatmunka."
    },
    {
      title: "NetPincér ételkiszállító",
      year: "2021",
      description: "Időgazdálkodás és önálló munkavégzés."
    },
    {
      title: "Jégkert, VV EVENT Kft.",
      year: "2017 – 2019",
      description: "Pultos, felszolgáló, terhelhetőség és monotonitástűrés."
    }
  ],
  skills: [
    {
      category: "Irodai és Elemző Eszközök",
      items: [
        "Haladó Microsoft Excel (Pivot táblák, FKERES/XKERES, összetett feltételes logikák, makrók/VBA)",
        "KPI-mérés, adatelemzés, menedzsment riportok készítése",
        "Microsoft Office csomag (Word, PowerPoint)"
      ]
    },
    {
      category: "Projekt- és Feladatkezelés",
      items: [
        "ClickUp, Git, GitHub",
        "Követelményfelmérés, folyamatleírás, specifikációkészítés, sprint-tervezés"
      ]
    },
    {
      category: "Fejlesztői Ismeretek",
      items: [
        "TypeScript, Svelte / SvelteKit (Svelte 5), HTML5, Tailwind CSS",
        "Python (alapszint)",
        "Progressive Web Apps (PWA) architektúra"
      ]
    },
    {
      category: "Felhő és Backend",
      items: [
        "Firebase ökoszisztéma (Firestore, Authentication, Cloud Functions, Hosting)"
      ]
    },
    {
      category: "Mesterséges Intelligencia",
      items: [
        "Prompt engineering",
        "LLM-alapú rendszerszervezés és vibe-coding",
        "Gemini API integráció",
        "Gyors prototípuskészítés"
      ]
    }
  ],
  languages: [
    {
      language: "Angol",
      level: "C1",
      description: "Felsőfokú nyelvvizsga, tárgyalóképes üzleti és szakmai szint"
    }
  ],
  drivingLicense: "B kategória"
};

export const SAMPLE_JOB_OFFERS = [
  {
    title: "Junior IT Üzleti Elemző / Business Analyst",
    text: `Pozíció: Junior IT Üzleti Elemző (Business Analyst)
Cég: FinTech & Digitális Transzformációs Megoldások Zrt.
Elvárások:
- Gazdasági és/vagy informatikai felsőfokú végzettség (vagy folyamatban lévő tanulmányok).
- Kiváló analitikus gondolkodásmód, üzleti folyamatok és KPI-ok megértése.
- Magabiztos MS Excel tudás (Pivot, függvények, adatelemzés).
- Képesség üzleti igények felmérésére, funkcionális specifikációk megírására és fejlesztők felé való közvetítésére.
- Érdeklődés az agilis módszertanok (Scrum, sprint-tervezés) és a felhőalapú rendszerek iránt.
- Előny: SQL / adatbázis ismeretek, Jira/ClickUp tapasztalat, AI eszközök készségszintű használata.
- Tárgyalóképes angol nyelvtudás szóban és írásban.
Feladatok:
- Üzleti igények felmérése, folyamatábrák és specifikációk készítése.
- Rendszerkövetelmények egyeztetése a fejlesztői csapattal és tesztelés támogatása.
- Vezetői dashboardok és KPI kimutatások készítése.`
  },
  {
    title: "Junior Full-Stack Fejlesztő (TypeScript / Modern Frontend & Cloud)",
    text: `Pozíció: Junior Full-Stack Webfejlesztő
Cég: Modern Web & Cloud Solutions Kft.
Elvárások:
- Magabiztos modern JavaScript / TypeScript ismeret.
- Tapasztalat modern reaktív frontend keretrendszerrel (Svelte, React vagy Vue).
- Ismeretek a backend és felhőszolgáltatások terén (Firebase, Cloud Functions, Node.js REST API-k).
- Git/GitHub verziókezelés magabiztos használata.
- Érdeklődés a generatív AI (LLM / Gemini API) fejlesztési folyamatokba integrálása iránt.
- Kiváló problémamegoldó képesség, tiszta kód szemlélet.
- Angol nyelvtudás (szakmai dokumentációk megértése és kommunikáció).
Feladatok:
- Új funkciók fejlesztése PWA és webalkalmazásokban.
- Felhőalapú adatbázisok és szerver nélküli függvények karbantartása.
- UI/UX tervek megvalósítása Tailwind CSS használatával.`
  },
  {
    title: "Junior Kontrolling & Pénzügyi Elemző",
    text: `Pozíció: Junior Kontrolling & Pénzügyi Elemző
Cég: Nemzetközi Kereskedelmi és Szolgáltató Csoport
Elvárások:
- Befejezett vagy folyamatban lévő gazdasági szakos diploma (pénzügy, számvitel vagy gazdálkodás és menedzsment).
- Erős gazdasági elméleti háttér: mérleg, eredménykimutatás, NPV, pénzügyi modellezés.
- Haladó szintű Excel készségek (FKERES/XKERES, Pivot, összetett feltételes formázások, automatizáció).
- Érdeklődés az adminisztrációs folyamatok automatizációja és az IT/AI megoldások bevezetése iránt.
- Megbízhatóság, precizitás, határidők szigorú betartása.
- Tárgyalóképes angol nyelvtudás.
Feladatok:
- Havi pénzügyi zárások támogatása és eltéréselemzések készítése.
- Tranzakciók egyeztetése, banki és számla-adatok aggregálása és riportálása.
- Részvétel a belső folyamatautomatizációs és digitalizációs projektekben.`
  }
];
