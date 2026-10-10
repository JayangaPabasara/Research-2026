/** Local names supplied by the teammate. Backend metadata is unavailable today.
 * These are display/question terms, never treatment or dosage recommendations.
 */
export interface TaxonomyTopic {
  canonical: string
  english: string
  sinhala: string | null
  aliases: string[]
}

export const LOCAL_TAXONOMY: TaxonomyTopic[] = [
  { canonical: 'bacterial leaf blight', english: 'Bacterial Leaf Blight', sinhala: 'බැක්ටීරියා පත්‍ර අංගමාරය', aliases: ['bacterial blight', 'rice bacterial leaf blight'] },
  { canonical: 'leaf blast', english: 'Leaf Blast', sinhala: 'තලා රෝගය', aliases: ['rice leaf blast', 'blast'] },
  { canonical: 'brown spot', english: 'Brown Spot', sinhala: 'දුඹුරු පුල්ලි රෝගය', aliases: ['rice brown spot'] },
  { canonical: 'brown planthopper', english: 'Brown Planthopper', sinhala: 'දුඹුරු මකුණා', aliases: ['bph', 'rice brown planthopper'] },
  { canonical: 'rice gall midge', english: 'Rice Gall Midge', sinhala: 'ගොයම් මකුණා', aliases: ['gall midge'] },
  { canonical: 'rice leaf folder', english: 'Rice Leaf Folder', sinhala: 'කොළ නවන පණුවා', aliases: ['leaf folder', 'rice leaffolder', 'leaffolder'] },
  { canonical: 'rice hispa', english: 'Rice Hispa', sinhala: 'හිස්පා පණුවා', aliases: ['hispa'] },
  { canonical: 'rice stem borer', english: 'Rice Stem Borer', sinhala: 'කඳ පණුවා', aliases: ['stem borer'] },
]

export function normalizeTaxonomyName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

export function findTaxonomyTopic(name: string, taxonomy = LOCAL_TAXONOMY): TaxonomyTopic | undefined {
  const key = normalizeTaxonomyName(name)
  return taxonomy.find(item => [item.canonical, item.english, ...item.aliases].some(alias => normalizeTaxonomyName(alias) === key))
}

export function resolveTaxonomyToSinhala(name: string, taxonomy = LOCAL_TAXONOMY): string {
  return findTaxonomyTopic(name, taxonomy)?.sinhala || name.replace(/_/g, ' ').trim()
}
