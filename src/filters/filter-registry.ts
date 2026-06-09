import { RouteFilter } from './route-filter.interface';
import { PublicExposedFilter } from './public-exposed.filter';
import { SinkFilter } from './sink.filter';
import { VulnerabilityFilter } from './vulnerability.filter';
import { FilterKey } from './filter.types';

export class FilterRegistry {
  private readonly registry = new Map<FilterKey, RouteFilter>([
    [FilterKey.PublicExposed, new PublicExposedFilter()],
    [FilterKey.Sink, new SinkFilter()],
    [FilterKey.Vulnerability, new VulnerabilityFilter()],
  ]);

  getFilter(key: FilterKey): RouteFilter | undefined {
    return this.registry.get(key);
  }

  isKnownKey(key: string): key is FilterKey {
    return this.registry.has(key as FilterKey);
  }
}

export const filterRegistry = new FilterRegistry();
