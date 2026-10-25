import { z } from "zod";
import {
  PRICE_MAX,
  PRICE_MIN,
  VINTAGE_MIN,
  WINE_DETAIL_MAX,
  WINE_NAME_MAX,
} from "@/domain/wine";
import { optionalText } from "./optional-text";

const priceMessage = `Ange ett pris i hela kronor, mellan ${PRICE_MIN} och ${PRICE_MAX}`;

const nameRequiredMessage = "Ange vinets namn";
const vintageMessage = "Ange ett årtal eller lämna tomt";

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
function numberFromForm(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
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
