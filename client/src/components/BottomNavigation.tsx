import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomTabBar } from './mobile/BottomTabBar';

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return <BottomTabBar currentPath={location.pathname} onNavigate={(path) => navigate(path)} />;
};

export default BottomNavigation;
