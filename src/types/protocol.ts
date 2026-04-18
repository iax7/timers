export interface Interval {
  label: string
  duration: number
}

export interface Protocol {
  id: string
  name: string
  description: string
  sets: number
  prepTime: number
  restBetweenSets: number
  intervals: Interval[]
}
