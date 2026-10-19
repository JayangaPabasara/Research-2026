import { uiText } from '@/i18n/text'
import { useState } from 'react'
import { Calculator, Droplets, Ruler } from 'lucide-react'
import type { ChemicalEntry } from '@/lib/chatApi'
import { parseQuantity, midpoint, scaleRange, formatRange } from '@/lib/dosageCalc'

interface DosageCalculatorProps {
  chemicals: ChemicalEntry[]
  language?: string
}

type Mode = 'liters' | 'area'
type AreaUnit = 'acres' | 'hectares'

interface ChemicalResult {
  chemical: ChemicalEntry
  doseUnit: string
  canCalculate: boolean
  chemicalNeeded: ReturnType<typeof scaleRange> | null
  litersNeeded: number | null
  areaCovered: number | null
}

/** Computes one chemical's result from the SAME shared liters/area input every chemical below uses. */
function computeResult(
  chemical: ChemicalEntry,
  mode: Mode,
  areaUnit: AreaUnit,
  liters: number | null,
  area: number | null
): ChemicalResult {
  const doseRange = parseQuantity(chemical.dose_per_liter_water)
  const coverageRange = parseQuantity(
    areaUnit === 'acres' ? chemical.coverage_per_liter_mixture_acres : chemical.coverage_per_liter_mixture_hectares
  )
  const doseUnit = doseRange?.unit || 'units'
  const canCalculate = Boolean(doseRange || coverageRange)

  let chemicalNeeded: ReturnType<typeof scaleRange> | null = null
  let litersNeeded: number | null = null
  let areaCovered: number | null = null

  if (mode === 'liters') {
    if (liters !== null && liters > 0) {
      if (doseRange) chemicalNeeded = scaleRange(doseRange, liters)
      if (coverageRange) areaCovered = midpoint(coverageRange) * liters
    }
  } else if (area !== null && area > 0 && coverageRange) {
    const perLiter = midpoint(coverageRange)
    if (perLiter > 0) {
      litersNeeded = area / perLiter
      if (doseRange) chemicalNeeded = scaleRange(doseRange, litersNeeded)
    }
  }

  return { chemical, doseUnit, canCalculate, chemicalNeeded, litersNeeded, areaCovered }
}

/** Pure display row — no inputs of its own, everything comes from the shared calculator state above. */
function ChemicalResultRow({
  result,
  mode,
  areaUnit,
  t,
}: {
  result: ChemicalResult
  mode: Mode
  areaUnit: AreaUnit
  t: (english: string, sinhala: string) => string
}) {
  const unitLabel = areaUnit === 'acres' ? t('acres', 'අක්කර') : t('hectares', 'හෙක්ටයාර්')
  const { chemical, doseUnit, canCalculate, chemicalNeeded, litersNeeded, areaCovered } = result
  const hasResult = Boolean(chemicalNeeded) || litersNeeded !== null || areaCovered !== null

  return (
    <div className="p-3 border rounded-xl border-beige bg-white/70">
      <p className="text-sm font-bold text-forest">{chemical.name}</p>

      {!canCalculate ? (
        <p className="mt-1 text-xs text-forest-muted">{t("Dosage/coverage not specified — can't calculate for this one.", "මාත්‍රාව හෝ ආවරණ ප්‍රමාණය සඳහන් කර නැති නිසා මෙය ගණනය කළ නොහැක.")}</p>
      ) : hasResult ? (
        <div className="px-3 py-2 mt-2 space-y-1 text-xs rounded-lg bg-amber-light/60">
          {chemicalNeeded && (
            <p className="flex items-center gap-1.5 font-semibold text-amber-dark">
              <Calculator className="h-3.5 w-3.5 shrink-0" />
              {t("Use", "භාවිතා කරන්න")}: {formatRange(chemicalNeeded)} {doseUnit}
            </p>
          )}
          {mode === 'liters' && areaCovered !== null && (
            <p className="text-forest-muted">{t("Covers approx.", "ආසන්න වශයෙන් ආවරණය කරයි")}: {formatRange(areaCovered)} {unitLabel}</p>
          )}
          {mode === 'area' && litersNeeded !== null && (
            <p className="text-forest-muted">{t("Needs approx.", "ආසන්න වශයෙන් අවශ්‍ය මිශ්‍රණය")}: {formatRange(litersNeeded)} {t("L of mixture", "ලීටර්")}</p>
          )}
        </div>
      ) : (
        <p className="mt-1 text-xs text-forest-muted">{t("Enter a value above to calculate.", "ගණනය කිරීමට ඉහත අගයක් ඇතුළත් කරන්න.")}</p>
      )}
    </div>
  )
}

export default function DosageCalculator({ chemicals, language }: DosageCalculatorProps) {
  const normalizedLanguage = (language || '').toLowerCase()
  const isSinhala = normalizedLanguage.startsWith('si') || normalizedLanguage.includes('sinhala')
  // Use the message language when available; otherwise retain the existing app translation system.
  const t = (english: string, sinhala: string) =>
    language ? (isSinhala ? sinhala : english) : uiText(english)

  // Shared across every chemical below — enter it once, see all results update together.
  const [mode, setMode] = useState<Mode>('liters')
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('acres')
  const [litersInput, setLitersInput] = useState('')
  const [areaInput, setAreaInput] = useState('')

  if (!chemicals || chemicals.length === 0) return null

  const parsedLiters = parseFloat(litersInput)
  const parsedArea = parseFloat(areaInput)
  const liters = litersInput.trim() !== '' && !Number.isNaN(parsedLiters) ? parsedLiters : null
  const area = areaInput.trim() !== '' && !Number.isNaN(parsedArea) ? parsedArea : null

  // Avoid duplicate calculator rows when the response contains repeated chemical names.
  const uniqueChemicals = chemicals.filter((chemical, index, all) =>
    all.findIndex((item) => item.name.trim().toLowerCase() === chemical.name.trim().toLowerCase()) === index
  )
  const results = uniqueChemicals.map((chemical) => computeResult(chemical, mode, areaUnit, liters, area))
  const anyCalculable = results.some((r) => r.canCalculate)

  return (
    <div className="mt-2 space-y-2.5 rounded-xl border border-amber/30 bg-amber-light/30 p-2.5">
      <p className="flex items-center gap-1.5 px-0.5 text-xs font-bold text-forest">
        <Calculator className="h-3.5 w-3.5" />
        {t("Dosage Calculator", "මාත්‍රා ගණකය")}</p>

      {/* Mode toggle — shared by every chemical listed below */}
      <div className="flex gap-1.5 rounded-lg bg-beige p-1">
        <button
          type="button"
          onClick={() => setMode('liters')}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
            mode === 'liters' ? 'bg-white text-forest shadow-sm' : 'text-forest-muted'
          }`}
        >
          <Droplets className="h-3.5 w-3.5" />
          {t("By water (L)", "ජල ප්‍රමාණය අනුව (L)")}</button>
        <button
          type="button"
          onClick={() => setMode('area')}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
            mode === 'area' ? 'bg-white text-forest shadow-sm' : 'text-forest-muted'
          }`}
        >
          <Ruler className="h-3.5 w-3.5" />
          {t("By field size", "වගා බිම් ප්‍රමාණය අනුව")}</button>
      </div>

      {/* Single shared input, applied to every chemical in the results list below */}
      <div className="flex items-end gap-2">
        {mode === 'liters' ? (
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-medium text-forest-muted">{t("Water/mixture (liters)", "ජලය/මිශ්‍රණය (ලීටර්)")}</label>
            <input
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={litersInput}
              onChange={(e) => setLitersInput(e.target.value)}
              placeholder={t("e.g. 16", "උදා. 16")}
              className="h-9 w-full rounded-lg border border-beige bg-beige px-2.5 text-sm text-forest outline-none focus:border-forest"
            />
          </div>
        ) : (
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-medium text-forest-muted">{t("Field size", "වගා බිම් ප්‍රමාණය")}</label>
            <input
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              placeholder={t("e.g. 2", "උදා. 2")}
              className="h-9 w-full rounded-lg border border-beige bg-beige px-2.5 text-sm text-forest outline-none focus:border-forest"
            />
          </div>
        )}

        <div className="shrink-0">
          <label className="mb-1 block text-[11px] font-medium text-forest-muted">{t("Unit", "ඒකකය")}</label>
          <select
            value={areaUnit}
            onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
            className="px-2 text-sm border rounded-lg outline-none h-9 border-beige bg-beige text-forest focus:border-forest"
          >
            <option value="acres">{t("acres", "අක්කර")}</option>
            <option value="hectares">{t("hectares", "හෙක්ටයාර්")}</option>
          </select>
        </div>
      </div>

      {!anyCalculable && (
        <p className="px-0.5 text-xs text-forest-muted">
          {t("Dosage/coverage wasn't specified for these chemicals — showing names only.", "මෙම රසායනික සඳහා මාත්‍රාව හෝ ආවරණ ප්‍රමාණය සඳහන් කර නැත — නම් පමණක් පෙන්වයි.")}</p>
      )}

      {/* One row per suggested chemical — all driven by the single input above */}
      <div className="space-y-2">
        {results.map((result, i) => (
          <ChemicalResultRow key={`${result.chemical.name.trim().toLowerCase()}-${i}`} result={result} mode={mode} areaUnit={areaUnit} t={t} />
        ))}
      </div>
    </div>
  )
}