import { useState, useEffect, useCallback, useRef } from 'react';
import clubsApi from '../services/clubs.api.js';

/**
 * useUserDashboard Custom Hook
 * Handles:
 * 1. Fetching user's joined clubs
 * 2. Debounced fuzzy search for public clubs
 * 3. Infinite scrolling pagination
 * 4. Club membership joining
 */
export function useUserDashboard() {
  // My Joined Clubs state
  const [myClubs, setMyClubs] = useState([]);
  const [loadingMyClubs, setLoadingMyClubs] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [availableSports, setAvailableSports] = useState([]);

  // Public Clubs Infinite Pagination state
  const [clubs, setClubs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [joiningClubId, setJoiningClubId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Sentinel ref for infinite scroll observer
  const observerRef = useRef(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch My Joined Clubs
  const fetchMyClubs = useCallback(async () => {
    try {
      setLoadingMyClubs(true);
      const data = await clubsApi.getMyClubs();
      setMyClubs(data);
    } catch (err) {
      console.warn('Failed to load my clubs:', err);
    } finally {
      setLoadingMyClubs(false);
    }
  }, []);

  useEffect(() => {
    fetchMyClubs();
  }, [fetchMyClubs]);

  // Fetch Public Clubs for page 1 when debouncedSearch or selectedSport changes
  const fetchClubsPage1 = useCallback(async () => {
    try {
      setLoadingClubs(true);
      const query = selectedSport !== 'All' 
        ? `${debouncedSearch} ${selectedSport}`.trim() 
        : debouncedSearch;

      const res = await clubsApi.getPublicClubs({
        search: query,
        page: 1,
        limit: 6,
      });

      setClubs(res.clubs || []);
      if (res.availableSports) {
        setAvailableSports(res.availableSports);
      }
      setPage(1);
      setHasMore(res.pagination?.hasMore || false);
    } catch (err) {
      console.warn('Failed to fetch public clubs:', err);
      setClubs([]);
      setHasMore(false);
    } finally {
      setLoadingClubs(false);
    }
  }, [debouncedSearch, selectedSport]);

  useEffect(() => {
    fetchClubsPage1();
  }, [fetchClubsPage1]);

  // Load next page for infinite scrolling
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loadingClubs) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const query = selectedSport !== 'All' 
        ? `${debouncedSearch} ${selectedSport}`.trim() 
        : debouncedSearch;

      const res = await clubsApi.getPublicClubs({
        search: query,
        page: nextPage,
        limit: 6,
      });

      const newClubs = res.clubs || [];
      setClubs((prev) => {
        // Prevent duplicate IDs
        const existingIds = new Set(prev.map((c) => c.id));
        const filteredNew = newClubs.filter((c) => !existingIds.has(c.id));
        return [...prev, ...filteredNew];
      });

      setPage(nextPage);
      setHasMore(res.pagination?.hasMore || false);
    } catch (err) {
      console.warn('Failed to load more clubs:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, loadingClubs, debouncedSearch, selectedSport]);

  // Setup IntersectionObserver for infinite scrolling pagination
  useEffect(() => {
    const sentinel = observerRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingClubs) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [loadMore, hasMore, loadingMore, loadingClubs]);

  // Join Club handler
  const handleJoinClub = useCallback(
    async (clubId) => {
      try {
        setJoiningClubId(clubId);
        await clubsApi.joinClub(clubId);
        setToastMessage({ type: 'success', text: 'Successfully joined club!' });
        await fetchMyClubs();
      } catch (err) {
        const msg = err.response?.data?.message || 'Could not join club at this time';
        setToastMessage({ type: 'error', text: msg });
      } finally {
        setJoiningClubId(null);
      }
    },
    [fetchMyClubs]
  );

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  return {
    myClubs,
    loadingMyClubs,
    clubs,
    loadingClubs,
    loadingMore,
    hasMore,
    searchTerm,
    setSearchTerm,
    selectedSport,
    setSelectedSport,
    availableSports,
    observerRef,
    handleJoinClub,
    joiningClubId,
    toastMessage,
    clearToast,
    refreshMyClubs: fetchMyClubs,
  };
}

export default useUserDashboard;
