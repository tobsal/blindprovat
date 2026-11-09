import { z } from "zod";
import {
  PRICE_MAX,
  PRICE_MIN,
  VINTAGE_MIN,
  WINE_DETAIL_MAX,
  WINE_NAME_MAX,
  WINE_TYPES,
} from "@/domain/wine";
import { optionalText } from "./optional-text";

const priceMessage = `Ange ett pris i hela kronor, mellan ${PRICE_MIN} och ${PRICE_MAX}`;

const nameRequiredMessage = "Ange vinets namn";
const vintageMessage = "Ange ett årtal eller lämna tomt";
const typeMessage = "Välj vintyp";

function optionalDetail(label: string) {
  return optionalText(
    WINE_DETAIL_MAX,
    `${label} får vara högst ${WINE_DETAIL_MAX} tecken`,
  );
}

export const wineInputSchema = z.object({
  name: z
    .string({ error: nameRequiredMessage })
    .trim()
    .min(1, nameRequiredMessage)
    .max(WINE_NAME_MAX, `Namnet får vara högst ${WINE_NAME_MAX} tecken`),
  type: z.enum(WINE_TYPES, { error: typeMessage }),
  producer: optionalDetail("Producenten"),
  grape: optionalDetail("Druvan"),
  region: optionalDetail("Regionen"),
  country: optionalDetail("Landet"),
  // null betyder årgångslöst (NV).
  vintage: z
    .number({ error: vintageMessage })
    .int(vintageMessage)
    .nullish()
    .transform((value) => value ?? null)
    .refine(
      (year) =>
        year === null ||
        (year >= VINTAGE_MIN && year <= new Date().getFullYear()),
      { error: `Årgången måste vara mellan ${VINTAGE_MIN} och i år` },
    ),
  price: z
    .number({ error: priceMessage })
    .int(priceMessage)
    .min(PRICE_MIN, priceMessage)
    .max(PRICE_MAX, priceMessage)
    .nullish()
    .transform((value) => value ?? null),
});

export type WineInput = z.infer<typeof wineInputSchema>;

// Formulär skickar tal som text. Tomt fält betyder inget värde, och text
// som inte är ett tal blir NaN så att talregeln ger sitt felmeddelande.
// Alla blanktecken tas bort så att svenska tusentalsavgränsare ("1 200",
// även med hårt eller smalt hårt mellanslag) godtas.
function numberFromForm(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const digits = value.replace(/\s/g, "");
  return digits === "" ? null : Number(digits);
}

export const wineFormSchema = wineInputSchema.extend({
  vintage: z.preprocess(numberFromForm, wineInputSchema.shape.vintage),
  price: z.preprocess(numberFromForm, wineInputSchema.shape.price),
});

// Blindnumret kommer från sökvägen eller formuläret. Ett ogiltigt nummer ska
// ge "hittades inte", inte ett databasfel.
export const blindNumberSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,5}$/)
  .transform(Number);

// Vinets id kommer från admins formulär. Ett ogiltigt id ska ge "hittades
// inte", inte ett databasfel.
export const wineIdSchema = z.uuid();
