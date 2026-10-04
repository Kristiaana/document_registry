import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { escapeLike } from '../documents.service';
import { QueryDocumentsDto } from './query-documents.dto';

const parse = (query: Record<string, unknown>) => {
  const dto = plainToInstance(QueryDocumentsDto, query);
  return { dto, errors: validateSync(dto) };
};

describe('QueryDocumentsDto', () => {
  it('piemēro noklusējuma vērtības', () => {
    const { dto, errors } = parse({});
    expect(errors).toEqual([]);
    expect(dto).toMatchObject({ sortBy: 'createdDate', sortOrder: 'desc', page: 1, limit: 20 });
  });

  it('pārvērš query virknes pareizos tipos', () => {
    const { dto, errors } = parse({
      importance: 'high,critical',
      category: ['public', 'internal'],
      active: 'false',
      page: '3',
      limit: '50',
    });
    expect(errors).toEqual([]);
    expect(dto).toMatchObject({
      importance: ['high', 'critical'],
      category: ['public', 'internal'],
      active: false,
      page: 3,
      limit: 50,
    });
  });

  it.each([
    [{ sortBy: 'id; DROP TABLE documents' }, 'sortBy'],
    [{ sortOrder: 'up' }, 'sortOrder'],
    [{ importance: 'urgent' }, 'importance'],
    [{ active: 'yes' }, 'active'],
    [{ limit: '1000' }, 'limit'],
    [{ page: '0' }, 'page'],
  ])('noraida nederīgu vērtību %j', (query, property) => {
    expect(parse(query).errors.map((e) => e.property)).toEqual([property]);
  });
});

describe('escapeLike', () => {
  it('ekranē LIKE aizstājējzīmes', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});
