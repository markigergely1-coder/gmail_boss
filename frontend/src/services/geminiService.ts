import { MASTER_PROFILE, type MasterProfile } from '../data/masterProfile';

export interface GenerateCvParams {
  jobDescription: string;
  targetRole?: string;
  language: 'hu' | 'en';
  apiKey: string;
  model?: string;
}

export function buildSystemPrompt(language: 'hu' | 'en', masterProfile: MasterProfile): string {
  const isEn = language === 'en';

  return `Te egy csúcsszintű, professzionális HR tanácsadó és executive CV író szakértő vagy.
Feladatod: A megadott Felhasználói Mester Adatbázis (Master Profile) VALÓS tényeiből és a megadott Álláshirdetés szövegéből generálj egy pontosan 1 A4-es oldal terjedelmű, professzionális Markdown formátumú önéletrajzot.

A kimenet nyelve: ${isEn ? 'ANGOL (Business English)' : 'MAGYAR (Hivatalos, precíz magyar szakmai nyelv)'}.

SZIGORÚ SZABÁLYRENDSZER ÉS STRUKTÚRA:
1. FELSŐ FEJLÉC (egy sorban):
${isEn 
  ? '# Gergely Márki | +36 (30) 844 1720 | markigergely1@gmail.com | [Keresett pozíció pontos megnevezése]'
  : '# Márki Gergely | +36 (30) 844 1720 | markigergely1@gmail.com | [Keresett pozíció pontos megnevezése]'
}

2. MIT NYER VELEM A CÉG? / SZEMÉLYES PROFIL:
${isEn ? '## Professional Profile & Value Proposition' : '## Személyes Profil & Értékajánlat'}
- Szigorúan 3–4 mondat.
- Összeköti a gazdasági végzettséget (BME Gazdálkodási és menedzsment BSc, ELTE Vezetés és szervezés MSc) és az IT/AI affinitást (Svelte 5, TypeScript, Python, Gemini API integráció, Firebase felhő architektúra, Vodafone Digital Engineering) a hirdetésben szereplő cég konkrét elvárásaival.

3. ERŐSSÉGEIM:
${isEn ? '## Core Strengths' : '## Főbb Erősségek'}
- Szigorúan 3–5 fókuszált pont (bullet point).

4. MUNKAKÖRHÖZ KAPCSOLÓDÓ SZAKMAI TAPASZTALATOK:
${isEn ? '## Relevant Professional Experience' : '## Releváns Szakmai Tapasztalatok'}
- Szigorúan 8–10 soros felsorolás.
- Minden sor vastagon szedett témamegjelöléssel indul: '- **Téma:** Részletes leírás'.
- KRITIKUS SZABÁLY: Kizárólag a mester adatbázis valós adatait keretezi át a megpályázott álláshirdetés kulcsszavaira és céljaira! Semmilyen valótlan állítást, el nem végzett feladatot vagy nem létező céget nem találhatsz ki!

5. MUNKATAPASZTALATOK HELYE ÉS IDEJE:
${isEn ? '## Work History' : '## Szakmai Pályafutás Idővonala'}
- Időrendi lista a szervezetek nevével, szerepkörrel és évszámokkal (Röplabda Admin PWA 2023–jelenleg, Matematika magántanár 2024–2026, BME Motorsport 2021, Vodafone Digital Engineering 2020–2021).

6. VÉGZETTSÉGEK:
${isEn ? '## Education' : '## Tanulmányok'}
- Kizárólag az egyetemi szintű diplomák feltüntetése:
  * ELTE – Vezetés és szervezés mesterszak (MSc), 2024 – 2026
  * BME – Gazdálkodási és menedzsment alapszak (BSc), 2020 – 2024 (Releváns tárgyak: Vállalati pénzügyek, számvitel, kontrolling, NPV, mérleg és eredménykimutatás logikája, döntéselmélet)
  * Középiskolát ITT NEM SZABAD MEGJELENÍTENI!

7. NYELVTUDÁS ÉS JOGOSÍTVÁNY:
${isEn ? '## Languages & Licenses' : '## Nyelvtudás & Jogosítvány'}
- Angol C1 (felsőfokú tárgyalóképes üzleti és szakmai szint) | B kategóriás jogosítvány.

8. INFORMATIKAI HASZNÁLAT (IT KÉSZSÉGEK):
${isEn ? '## Technical Skills' : '## Informatikai & Technológiai Készségek'}
- Kategóriákra bontott felsorolás:
  * Irodai és Elemző szoftverek (Haladó MS Excel, Pivot, FKERES/XKERES, makrók/VBA, KPI riportok, MS Office)
  * Projekt- és Feladatkezelés (ClickUp, Git, GitHub, specifikációkészítés, követelményfelmérés, sprint-tervezés)
  * Fejlesztői Ismeretek (TypeScript, Svelte / SvelteKit (Svelte 5), HTML5, Tailwind CSS, Python alapszint, PWA architektúra)
  * Felhő és Backend (Firebase: Firestore, Authentication, Cloud Functions, Hosting)
  * Mesterséges Intelligencia (Prompt engineering, LLM-alapú rendszerszervezés, Gemini API integráció, gyors prototípuskészítés)

TERJEDELMI ÉS FORMÁTUM KÖVETELMÉNY:
- A formázásnak szabványos margók és betűméret mellett szigorúan 1 A4-es oldalra kell kiférnie!
- Tömör, dinamikus, prémium megfogalmazást használj.
- KIZÁRÓLAG a nyers Markdown szöveget add vissza. Ne tegyél köré \`\`\`markdown kódrészlet jeleket, és ne fűzz hozzá semmilyen köszönést, kísérőszöveget vagy kommentárt!

FELHASZNÁLÓI MESTER ADATBÁZIS:
${JSON.stringify(masterProfile, null, 2)}
`;
}

export async function generateTailoredCv(params: GenerateCvParams): Promise<string> {
  const { jobDescription, targetRole, language, apiKey, model = 'gemini-2.5-flash' } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('Kérlek add meg a Google Gemini API kulcsodat a generáláshoz!');
  }

  if (!jobDescription || !jobDescription.trim()) {
    throw new Error('Kérlek illeszd be az álláshirdetés szövegét!');
  }

  const systemPrompt = buildSystemPrompt(language, MASTER_PROFILE);

  const userPrompt = `Íme a megpályázott álláshirdetés szövege:
"""
${jobDescription.trim()}
"""

${targetRole ? `Megcélzott pozíció megnevezése: ${targetRole.trim()}` : 'Pozíció megnevezése: Automatikusan olvasd ki a hirdetésből a legpontosabb pozíciónévként.'}

Készítsd el a pontosan 1 oldalas, személyre szabott Markdown önéletrajzot a megadott Mester Adatbázis és szabályrendszer alapján!`;

  // Try the selected model, with fallback to gemini-1.5-flash if needed
  const modelsToTry = [model, 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'].filter(
    (m, idx, arr) => arr.indexOf(m) === idx
  );

  let lastError: Error | null = null;

  for (const currentModel of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemPrompt}\n\n${userPrompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2500,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // If it's a model not found error (404), try next model in loop
        if (response.status === 404) {
          lastError = new Error(`A(z) ${currentModel} modell nem érhető el: ${errMsg}`);
          continue;
        }
        
        throw new Error(`Gemini API Hiba (${currentModel}): ${errMsg}`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const rawText = candidate?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('A Gemini API nem adott vissza szöveges választ.');
      }

      // Clean up markdown code block fence if present
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```markdown')) {
        cleaned = cleaned.replace(/^```markdown\s*/i, '').replace(/```\s*$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }

      return cleaned;
    } catch (err: any) {
      lastError = err;
      if (err.message && err.message.includes('API_KEY_INVALID')) {
        throw new Error('Érvénytelen Gemini API kulcs! Kérlek ellenőrizd a Google AI Studio-ban generált kulcsodat.');
      }
      // Continue to next model if not key error
    }
  }

  throw lastError || new Error('Nem sikerült generálni a CV-t a megadott modellekkel.');
}

/**
 * Deterministic offline fallback sample generator in case user doesn't have an API key right away
 */
export function generateLocalSampleCv(_jobDescription?: string, language: 'hu' | 'en' = 'hu', targetRole?: string): string {
  const isEn = language === 'en';
  const roleName = targetRole || (isEn ? "Junior IT Business Analyst / Full-Stack Developer" : "Junior IT Rendszerelemző / Fejlesztő");

  if (isEn) {
    return `# Gergely Márki | +36 (30) 844 1720 | markigergely1@gmail.com | ${roleName}

## Professional Profile & Value Proposition
Business Administration graduate (BME) and current Management & Leadership MSc student (ELTE) combining economic acumen with hands-on software development and AI engineering capabilities. Proven track record in building and maintaining production web applications (Svelte 5, TypeScript, Firebase) and designing enterprise-grade data workflows. Dedicated to bridging business stakeholder requirements with high-performance IT solutions and agile execution.

## Core Strengths
- Strong analytical and problem-solving mindset with end-to-end system planning and specification capabilities.
- Practical bridge between business logic (finance, controlling, KPIs) and scalable software engineering.
- Rapid prototyping and workflow automation utilizing modern LLM integrations (Gemini API) and modern web tech.
- Proactive team player with direct corporate reporting experience and stakeholder demonstration skills.

## Relevant Professional Experience
- **Full-Stack Architecture & Development:** Designed and deployed an amateur sports club administration PWA in production using Svelte 5, TypeScript, and Firebase.
- **Automated Financial Module & Reporting:** Built an automated monthly fee calculation engine, PDF generation (jspdf), and Revolut CSV reconciliation system.
- **Enterprise IAM & Permission Audits:** Mapped and administered corporate user privileges via Identity & Access Management (IAM) software at Vodafone Digital Engineering.
- **Disaster Recovery & QA Testing:** Authored and conducted manual disaster recovery test cases for mission-critical backup software to ensure high availability.
- **Executive Demonstrations & Stakeholder Alignment:** Led live screen-sharing product demos presenting software releases directly to senior corporate stakeholders.
- **Advanced Data Analytics & KPI Reporting:** Leveraged Microsoft Excel (Pivot tables, XLOOKUP, conditional logic, VBA macros) to compute and report operational department KPIs.
- **Agile Project Management:** Structured user stories, sprint planning, and task tracking via ClickUp, maintaining clean Git/GitHub version control.
- **AI-Assisted Workflow Integration:** Implemented Google Gemini API integration and prompt engineering techniques to accelerate modular full-stack development.
- **Structured Knowledge Transfer:** Formulated differentiated diagnostic assessments and tailored curricula as a freelance mathematics tutor.

## Work History
- **2023 – Present:** Independent Software Project (Volleyball Admin PWA) – *Full-stack Developer & Product Owner*
- **2024 – 2026:** Freelance – *Mathematics Tutor*
- **2021:** BME Motorsport – *Marketing Associate*
- **2020 – 2021:** Vodafone Hungary (Digital Engineering) – *Junior IT Analyst Intern*

## Education
- **2024 – 2026:** **Eötvös Loránd University (ELTE)** – MSc in Management & Leadership
- **2020 – 2024:** **Budapest University of Technology and Economics (BME)** – BSc in Business Administration & Management
  *(Relevant coursework: Corporate Finance, Accounting, Controlling, NPV Analysis, Financial Statement Logic, Decision Theory)*

## Languages & Licenses
- **English:** C1 Advanced (Full professional & business proficiency, advanced language certificate)
- **Driving License:** Category B

## Technical Skills
- **Office & Analytics:** Advanced Microsoft Excel (Pivot, XLOOKUP, VBA/Macros), KPI reporting, MS Office Suite
- **Project & Delivery:** ClickUp, Git, GitHub, Requirement Analysis, Process Documentation, Sprint Planning
- **Software & Web:** TypeScript, Svelte / SvelteKit (Svelte 5), HTML5, Tailwind CSS, Python (Basics), PWA Architecture
- **Cloud & Backend:** Firebase Platform (Firestore, Authentication, Cloud Functions, Hosting)
- **Artificial Intelligence:** Prompt Engineering, Gemini API Integration, LLM System Architecture, Rapid Prototyping`;
  }

  return `# Márki Gergely | +36 (30) 844 1720 | markigergely1@gmail.com | ${roleName}

## Személyes Profil & Értékajánlat
Gazdasági felsőfokú végzettséggel (BME Gazdálkodási és menedzsment BSc) és folyamatban lévő mesterképzéssel (ELTE Vezetés és szervezés MSc) rendelkezem, amelyet gyakorlati szoftverfejlesztési és mesterséges intelligencia tapasztalattal ötvözök. Bizonyított gyakorlatom van éles webes rendszerek felépítésében (Svelte 5, TypeScript, Firebase) és vállalati szintű folyamatelemzésben. Célom, hogy a gazdasági döntéshozatali szempontokat és a technológiai megvalósítást összekötve azonnali értéket teremtsek a pozícióban.

## Főbb Erősségek
- Analitikus és strukturált rendszerszemlélet, gazdasági KPI-ok és funkcionális specifikációk precíz leképezése.
- Hatékony híd a szakterületi üzleti megrendelők és a technológiai fejlesztőcsapatok között.
- Gyors prototípuskészítés és modern LLM / Gemini API munkafolyamat-automatizáció.
- Megbízható, önálló munkavégzés nemzetközi vállalati környezetben szerzett tapasztalattal.

## Releváns Szakmai Tapasztalatok
- **Full-stack Alkalmazásfejlesztés:** Éles PWA adminisztrációs rendszer tervezése és fejlesztése Svelte 5 ($state, $derived), TypeScript és Firebase architektúrán.
- **Pénzügyi Automatizáció & Elszámolás:** Automata havi tagdíj-kalkulációs modul, PDF számlakészítés (jspdf) és Revolut CSV banki tranzakció-egyeztetés lefejlesztése.
- **Vállalati Jogosultságkezelés (IAM):** Belső felhasználói hozzáférések felmérése és adminisztrációja Identity and Access Management rendszerrel a Vodafone Digital Engineering részlegén.
- **Disaster Recovery & Manuális Tesztelés:** Rendszer-helyreállítási backup szoftverek manuális teszteseteinek összeállítása és végrehajtása kritikus leállási helyzetekre.
- **Vezetői Prezentációk & Demók:** Szoftveres módosítások és teszteredmények bemutatása képernyőmegosztásos demókon felsővezetői megrendelők számára.
- **Haladó Adatmodellezés & Táblázatkezelés:** Összetett Excel modellek (Pivot, XKERES, feltételes logikák, makrók/VBA) készítése és részlegi KPI riportok összeállítása.
- **Agilis Munkafolyamatok & Specifikáció:** Követelmények felmérése, sprint-tervezés és feladatkezelés ClickUpban, verziókövetés Git/GitHub segítségével.
- **Mesterséges Intelligencia Integráció:** Gemini API alapú automatizációs megoldások és prompt engineering integrálása a mindennapi fejlesztésbe.
- **Analitikus Oktatás & Módszertan:** Összetett logikai összefüggések átadása, egyéni differenciált tantervek készítése matematika magántanárként.

## Szakmai Pályafutás Idővonala
- **2023 – jelenleg:** Önálló Szoftverfejlesztési Projekt (Röplabda Admin PWA) – *Full-stack fejlesztő és termékfelelős*
- **2024 – 2026:** Szabadúszó – *Matematika magántanár*
- **2021:** BME Motorsport – *Marketing munkatárs*
- **2020 – 2021:** Vodafone Magyarország (Digital Engineering) – *Junior IT Elemző Gyakornok*

## Tanulmányok
- **2024 – 2026:** **Eötvös Loránd Tudományegyetem (ELTE)** – Vezetés és szervezés mesterszak (MSc)
- **2020 – 2024:** **Budapesti Műszaki és Gazdaságtudományi Egyetem (BME)** – Gazdálkodási és menedzsment alapszak (BSc)
  *(Főbb tárgyak: Vállalati pénzügyek, számvitel, kontrolling, NPV, mérleg és eredménykimutatás logikája, döntéselmélet)*

## Nyelvtudás & Jogosítvány
- **Angol:** C1 szint (Felsőfokú nyelvvizsga, tárgyalóképes szakmai és üzleti szint)
- **Jogosítvány:** B kategória

## Informatikai & Technológiai Készségek
- **Irodai és Elemző szoftverek:** Haladó Microsoft Excel (Pivot, FKERES/XKERES, makrók/VBA), KPI mérés és riporting, MS Office (Word, PowerPoint)
- **Projekt- és Feladatkezelés:** ClickUp, Git, GitHub, specifikációkészítés, követelményfelmérés, sprint-tervezés
- **Fejlesztői Ismeretek:** TypeScript, Svelte / SvelteKit (Svelte 5), HTML5, Tailwind CSS, Python (alapok), PWA architektúra
- **Felhő és Backend:** Firebase ökoszisztéma (Firestore, Authentication, Cloud Functions, Hosting)
- **Mesterséges Intelligencia (AI):** Prompt engineering, Gemini API integráció, LLM-alapú rendszerszervezés, gyors prototípuskészítés`;
}
