import { describe, expect, it } from 'vitest'
import { buildQuery, emptyFilters, formatDate, formatReadingTime, toOptions, IMPORTANCE } from '../app/utils/documents'

describe('buildQuery', () => {
  it('tukši filtri -> tikai lapošana', () => {
    expect(buildQuery(emptyFilters(), undefined, 1, 20)).toEqual({ page: 1, limit: 20 })
  })

  it('iekļauj aizpildītos filtrus un šķirošanu', () => {
    const query = buildQuery(
      {
        search: '  politika ',
        importance: ['high', 'critical'],
        category: ['internal'],
        fileType: ['pdf'],
        department: 'IT departaments',
        active: 'false'
      },
      { id: 'readingTimeMinutes', desc: false },
      2,
      50
    )

    expect(query).toEqual({
      page: 2,
      limit: 50,
      search: 'politika',
      importance: 'high,critical',
      category: 'internal',
      fileType: 'pdf',
      department: 'IT departaments',
      active: 'false',
      sortBy: 'readingTimeMinutes',
      sortOrder: 'asc'
    })
  })

  it('"all" vērtības netiek sūtītas', () => {
    const query = buildQuery({ ...emptyFilters(), department: 'all', active: 'all' }, undefined, 1, 20)
    expect(query).not.toHaveProperty('department')
    expect(query).not.toHaveProperty('active')
  })
})

describe('formatēšana', () => {
  it('lasīšanas laiks', () => {
    expect(formatReadingTime(5)).toBe('5 min')
    expect(formatReadingTime(60)).toBe('1 h')
    expect(formatReadingTime(95)).toBe('1 h 35 min')
  })

  it('datums neslīd laika joslu dēļ', () => {
    expect(formatDate('2025-01-01')).toContain('2025')
    expect(formatDate('2025-01-01')).toContain('1')
  })

  it('toOptions saglabā secību un latviskos nosaukumus', () => {
    expect(toOptions(IMPORTANCE).map(o => o.label)).toEqual(['Zems', 'Vidējs', 'Augsts', 'Kritisks'])
  })
})
