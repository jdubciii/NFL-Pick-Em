import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomTabBar } from './mobile/BottomTabBar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  const isCommissioner = Boolean(
    user?.role === 'ADMIN'
  );

  const fetchPendingCount = useCallback(async () => {
    if (!isCommissioner) {
      setPendingCount(0);
      return;
    }
    try {
      const { count, error } = await supabase
        .from('pool_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('pool_id', activePoolId)
        .eq('status', 'PENDING');

      if (!error && typeof count === 'number') {
        setPendingCount(count);
      }
    } catch (err) {
      console.warn('Failed to fetch pending count:', err);
    }
  }, [isCommissioner]);

  useEffect(() => {
    fetchPendingCount();

    const handleUpdate = () => fetchPendingCount();
    window.addEventListener('pending-memberships-changed', handleUpdate);

    // Supabase real-time channel
    const channel = supabase
      .channel('bottom_nav_pending_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_memberships' }, () => {
        fetchPendingCount();
      })
      .subscribe();

    const interval = setInterval(fetchPendingCount, 15000);

    return () => {
      window.removeEventListener('pending-memberships-changed', handleUpdate);
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [fetchPendingCount]);

  return (
    <BottomTabBar 
      currentPath={location.pathname} 
      onNavigate={(path) => navigate(path)} 
      pendingCount={pendingCount}
    />
  );
};

export default BottomNavigation;
