import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface CountryOption {
  id: string;
  name: string;
}

export interface StateOption {
  id: string;
  name: string;
  countryId: string;
}

export interface CityOption {
  id: string;
  name: string;
  stateId: string;
  countryId: string;
}

export interface LocationHierarchy {
  countries: CountryOption[];
  statesByCountry: Record<string, StateOption[]>;
  citiesByState: Record<string, CityOption[]>;
}

/**
 * Firebase Location Service
 * Reads from `locationdata` collection as the source of truth.
 * Expected structure (example):
 * - Collection `locationdata`
 *   - Document type `country` with fields: { countryId, name }
 *   - Document type `state` with fields: { stateId, name, countryId }
 *   - Document type `city` with fields: { cityId, name, stateId, countryId }
 */
class LocationService {
  private collectionName = 'locationdata';

  async getAll(): Promise<LocationHierarchy> {
    try {
      const ref = collection(db, this.collectionName);
      const snapshot = await getDocs(query(ref));

      const countries: CountryOption[] = [];
      const states: StateOption[] = [];
      const cities: CityOption[] = [];

      snapshot.forEach((d) => {
        const data = d.data() as any;
        const type = (data.type || data.kind || '').toLowerCase();

        if (type === 'country' || (data.countryId && !data.stateId && !data.cityId)) {
          countries.push({ id: data.countryId || d.id, name: data.name || data.countryName || '' });
        } else if (type === 'state' || (data.stateId && data.countryId && !data.cityId)) {
          states.push({ id: data.stateId || d.id, name: data.name || data.stateName || '', countryId: data.countryId });
        } else if (type === 'city' || (data.cityId && data.stateId)) {
          cities.push({ id: data.cityId || d.id, name: data.name || data.cityName || '', stateId: data.stateId, countryId: data.countryId });
        }
      });

      // Fallback to separate collections if the primary collection has no data
      if (countries.length === 0 && states.length === 0 && cities.length === 0) {
        const sep = await this.loadFromSeparateCollections();
        if (
          sep.countries.length === 0 &&
          Object.keys(sep.statesByCountry).length === 0 &&
          Object.keys(sep.citiesByState).length === 0
        ) {
          return await this.loadFromUsers();
        }
        return sep;
      }

      const statesByCountry: Record<string, StateOption[]> = {};
      for (const s of states) {
        if (!statesByCountry[s.countryId]) statesByCountry[s.countryId] = [];
        statesByCountry[s.countryId].push(s);
      }

      const citiesByState: Record<string, CityOption[]> = {};
      for (const c of cities) {
        if (!citiesByState[c.stateId]) citiesByState[c.stateId] = [];
        citiesByState[c.stateId].push(c);
      }

      // Sort for consistent UX
      countries.sort((a, b) => a.name.localeCompare(b.name));
      Object.values(statesByCountry).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
      Object.values(citiesByState).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));

      return { countries, statesByCountry, citiesByState };
    } catch (err) {
      console.error('Error loading locationdata, attempting fallback collections', err);
      const sep = await this.loadFromSeparateCollections();
      if (
        sep.countries.length === 0 &&
        Object.keys(sep.statesByCountry).length === 0 &&
        Object.keys(sep.citiesByState).length === 0
      ) {
        return await this.loadFromUsers();
      }
      return sep;
    }
  }

  private async loadFromSeparateCollections(): Promise<LocationHierarchy> {
    try {
      const countriesSnap = await getDocs(query(collection(db, 'countries')));
      const statesSnap = await getDocs(query(collection(db, 'states')));
      const citiesSnap = await getDocs(query(collection(db, 'cities')));

      const countries: CountryOption[] = countriesSnap.docs.map((d) => {
        const data = d.data() as any;
        return { id: data.countryId || d.id, name: data.name || data.countryName || '' };
      });

      const states: StateOption[] = statesSnap.docs.map((d) => {
        const data = d.data() as any;
        return { id: data.stateId || d.id, name: data.name || data.stateName || '', countryId: data.countryId };
      });

      const cities: CityOption[] = citiesSnap.docs.map((d) => {
        const data = d.data() as any;
        return { id: data.cityId || d.id, name: data.name || data.cityName || '', stateId: data.stateId, countryId: data.countryId };
      });

      const statesByCountry: Record<string, StateOption[]> = {};
      for (const s of states) {
        if (!statesByCountry[s.countryId]) statesByCountry[s.countryId] = [];
        statesByCountry[s.countryId].push(s);
      }

      const citiesByState: Record<string, CityOption[]> = {};
      for (const c of cities) {
        if (!citiesByState[c.stateId]) citiesByState[c.stateId] = [];
        citiesByState[c.stateId].push(c);
      }

      countries.sort((a, b) => a.name.localeCompare(b.name));
      Object.values(statesByCountry).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
      Object.values(citiesByState).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));

      // If still empty, attempt users-based fallback
      if (
        countries.length === 0 &&
        Object.keys(statesByCountry).length === 0 &&
        Object.keys(citiesByState).length === 0
      ) {
        return await this.loadFromUsers();
      }
      return { countries, statesByCountry, citiesByState };
    } catch (fallbackErr) {
      console.error('Fallback collections load failed', fallbackErr);
      return await this.loadFromUsers();
    }
  }

  private async loadFromUsers(): Promise<LocationHierarchy> {
    try {
      const usersSnap = await getDocs(query(collection(db, 'users')));

      const countryMap = new Map<string, CountryOption>();
      const stateMap = new Map<string, StateOption>();
      const citiesByState: Record<string, CityOption[]> = {};

      const norm = (s: any) => (typeof s === 'string' ? s.trim() : '');

      usersSnap.forEach((d) => {
        const data = d.data() as any;
        const countryName = norm(data.country);
        const stateName = norm(data.state);
        const cityName = norm(data.city);

        if (!countryName) return;

        let country = countryMap.get(countryName);
        if (!country) {
          const cid = `country::${countryName.toLowerCase()}`;
          country = { id: cid, name: countryName };
          countryMap.set(countryName, country);
        }

        if (stateName) {
          const stateKey = `${country.name}::${stateName}`;
          let state = stateMap.get(stateKey);
          if (!state) {
            const sid = `state::${country.name.toLowerCase()}::${stateName.toLowerCase()}`;
            state = { id: sid, name: stateName, countryId: country.id };
            stateMap.set(stateKey, state);
          }

          if (cityName) {
            const cityId = `city::${state.name.toLowerCase()}::${cityName.toLowerCase()}`;
            const city: CityOption = { id: cityId, name: cityName, stateId: state.id, countryId: country.id };
            if (!citiesByState[state.id]) citiesByState[state.id] = [];
            if (!citiesByState[state.id].some((c) => c.name === city.name)) {
              citiesByState[state.id].push(city);
            }
          }
        }
      });

      const countries = Array.from(countryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      const statesByCountry: Record<string, StateOption[]> = {};
      for (const st of Array.from(stateMap.values())) {
        if (!statesByCountry[st.countryId]) statesByCountry[st.countryId] = [];
        statesByCountry[st.countryId].push(st);
      }
      Object.values(statesByCountry).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
      Object.values(citiesByState).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));

      return { countries, statesByCountry, citiesByState };
    } catch (err) {
      console.error('loadFromUsers failed', err);
      return { countries: [], statesByCountry: {}, citiesByState: {} };
    }
  }

  async getCountries(): Promise<CountryOption[]> {
    try {
      const ref = collection(db, this.collectionName);
      const snapshot = await getDocs(ref);
      const countries: CountryOption[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        const type = (data.type || data.kind || '').toLowerCase();
        if (type === 'country' || (data.countryId && !data.stateId && !data.cityId)) {
          countries.push({ id: data.countryId || d.id, name: data.name || data.countryName || '' });
        }
      });
      if (countries.length === 0) {
        const countriesSnap = await getDocs(collection(db, 'countries'));
        countries.push(...countriesSnap.docs.map(d => ({ id: (d.data() as any).countryId || d.id, name: (d.data() as any).name || (d.data() as any).countryName || '' })));
      }
      return countries.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error('getCountries failed', err);
      return [];
    }
  }

  async getStates(countryId: string): Promise<StateOption[]> {
    try {
      const ref = collection(db, this.collectionName);
      const snapshot = await getDocs(ref);
      const states: StateOption[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        const type = (data.type || data.kind || '').toLowerCase();
        if ((type === 'state' || data.stateId) && data.countryId === countryId) {
          states.push({ id: data.stateId || d.id, name: data.name || data.stateName || '', countryId: data.countryId });
        }
      });
      if (states.length === 0) {
        const statesSnap = await getDocs(collection(db, 'states'));
        states.push(...statesSnap.docs.map(d => {
          const data = d.data() as any;
          return { id: data.stateId || d.id, name: data.name || data.stateName || '', countryId: data.countryId };
        }).filter(s => s.countryId === countryId));
      }
      return states.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error('getStates failed', err);
      return [];
    }
  }

  async getCities(countryId: string, stateId: string): Promise<CityOption[]> {
    try {
      const ref = collection(db, this.collectionName);
      const snapshot = await getDocs(ref);
      const cities: CityOption[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        const type = (data.type || data.kind || '').toLowerCase();
        if ((type === 'city' || data.cityId) && data.countryId === countryId && data.stateId === stateId) {
          cities.push({ id: data.cityId || d.id, name: data.name || data.cityName || '', stateId: data.stateId, countryId: data.countryId });
        }
      });
      if (cities.length === 0) {
        const citiesSnap = await getDocs(collection(db, 'cities'));
        cities.push(...citiesSnap.docs.map(d => {
          const data = d.data() as any;
          return { id: data.cityId || d.id, name: data.name || data.cityName || '', stateId: data.stateId, countryId: data.countryId };
        }).filter(c => c.countryId === countryId && c.stateId === stateId));
      }
      return cities.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error('getCities failed', err);
      return [];
    }
  }
}

export const locationService = new LocationService();