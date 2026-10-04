import "dotenv/config";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";

config({ path: path.join(process.cwd(), ".env.local") });
import * as XLSX from "xlsx";
import postgres from "postgres";
import {
  deleteFoodItemsBySource,
} from "@/lib/db/nutrition-queries";
import { aliasesForFood } from "@/lib/nutrition/aliases";

function createImportClient() {
  return postgres(process.env.POSTGRES_URL ?? "", {
    prepare: false,
    ssl: "require",
  });
}

async function insertFoodRows(
  pg: ReturnType<typeof createImportClient>,
  rows: Array<{
    name: string;
    aliases: string[];
    source: "indb" | "ifct";
    sourceCode: string | null;
    kcalPer100g: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    servingUnit: string | null;
    servingGrams: number | null;
  }>
) {
  for (const row of rows) {
    await pg`
      INSERT INTO "FoodItem" (
        "aliases",
        "carbsG",
        "fatG",
        "fiberG",
        "kcalPer100g",
        "name",
        "proteinG",
        "servingGrams",
        "servingUnit",
        "source",
        "sourceCode"
      ) VALUES (
        ${pg.array(row.aliases)},
        ${row.carbsG},
        ${row.fatG},
        ${row.fiberG},
        ${row.kcalPer100g},
        ${row.name},
        ${row.proteinG},
        ${row.servingGrams},
        ${row.servingUnit},
        ${row.source}::food_source,
        ${row.sourceCode}
      )
    `;
  }
}

type IndbRow = {
  food_name?: string;
  energy_kcal?: number;
  protein_g?: number;
  carb_g?: number;
  fat_g?: number;
  fibre_g?: number;
  servings_unit?: string;
  unit_serving_energy_kcal?: number;
};

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function servingGramsFromRow(row: IndbRow, kcalPer100g: number) {
  const unitEnergy = num(row.unit_serving_energy_kcal);
  if (kcalPer100g <= 0 || unitEnergy <= 0) {
    return null;
  }
  return (unitEnergy / kcalPer100g) * 100;
}

async function importIndb() {
  const filePath = path.join(process.cwd(), "data", "INDB.xlsx");
  const workbook = XLSX.read(readFileSync(filePath), { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<IndbRow>(sheet);

  const foods = rows
    .filter((row) => row.food_name?.trim())
    .map((row, index) => {
      const name = String(row.food_name).trim();
      const kcalPer100g = num(row.energy_kcal);
      const aliasList = aliasesForFood(name.toLowerCase()).filter(
        (alias) => alias.toLowerCase() !== name.toLowerCase()
      );

      return {
        aliases: aliasList,
        carbsG: num(row.carb_g),
        fatG: num(row.fat_g),
        fiberG: num(row.fibre_g),
        kcalPer100g,
        name,
        proteinG: num(row.protein_g),
        servingGrams: servingGramsFromRow(row, kcalPer100g),
        servingUnit: row.servings_unit?.trim() ?? null,
        source: "indb" as const,
        sourceCode: `indb-${index + 1}`,
      };
    });

  const pg = createImportClient();
  try {
    try {
      await deleteFoodItemsBySource("indb");
    } catch {
      await pg`DELETE FROM "FoodItem" WHERE "source" = 'indb'::food_source`;
    }

    await insertFoodRows(pg, foods);
  } finally {
    await pg.end();
  }
  return foods.length;
}

async function importIfctOptional() {
  try {
    const moduleName = "ifct2017";
    const ifct = (await import(moduleName)) as {
      ingredients?: Array<Record<string, unknown>>;
      default?: { ingredients?: Array<Record<string, unknown>> };
    };
    const ingredients = ifct.ingredients ?? ifct.default?.ingredients;
    if (!ingredients?.length) {
      return 0;
    }

    const foods = ingredients
      .map(
        (item: {
          name?: string;
          code?: string;
          enerc?: number;
          protcnt?: number;
          choavldf?: number;
          fatce?: number;
          fibtg?: number;
        }) => {
          const name = String(item.name ?? "").trim();
          const aliasList = aliasesForFood(name.toLowerCase()).filter(
            (alias) => alias.toLowerCase() !== name.toLowerCase()
          );
          return {
            aliases: aliasList,
            carbsG: num(item.choavldf),
            fatG: num(item.fatce),
            fiberG: num(item.fibtg),
            kcalPer100g: num(item.enerc),
            name,
            proteinG: num(item.protcnt),
            servingGrams: 100,
            servingUnit: "serving",
            source: "ifct" as const,
            sourceCode: item.code ? String(item.code) : null,
          };
        }
      )
      .filter((food) => food.name.length > 0);

    const pg = createImportClient();
    try {
      await pg`DELETE FROM "FoodItem" WHERE "source" = 'ifct'::food_source`;
      await insertFoodRows(pg, foods);
    } finally {
      await pg.end();
    }
    return foods.length;
  } catch {
    return 0;
  }
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is required");
  }

  const indbCount = await importIndb();
  const ifctCount = await importIfctOptional();
  process.stdout.write(
    `Imported ${indbCount} INDB foods and ${ifctCount} IFCT foods.\n`
  );
}

main().catch((error) => {
  if (error instanceof Error) {
    process.stderr.write(`${error.message}\n`);
    if (error.cause) {
      process.stderr.write(`${String(error.cause)}\n`);
    }
  } else {
    process.stderr.write(`${error}\n`);
  }
  process.exit(1);
});
