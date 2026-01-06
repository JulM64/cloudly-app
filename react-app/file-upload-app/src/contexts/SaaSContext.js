import React, { createContext, useState, useContext, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient();
const SaaSContext = createContext();

export const useSaaS = () => useContext(SaaSContext);

export const SaaSProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [userRole, setUserRole] = useState('USER');
  const [subscriptionPlan, setSubscriptionPlan] = useState('FREE');
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit, setStorageLimit] = useState(1073741824); // 1GB

  // Load user and company data
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // TODO: Fetch company data from GraphQL
      // const companyData = await client.graphql({
      //   query: getCompanyByUser,
      //   variables: { userId: user.userId }
      // });
      
      // For now, use mock data
      setCurrentCompany({
        id: 'company-123',
        name: 'My Company',
        plan: 'FREE',
        storageLimit: 1073741824,
        storageUsed: 0
      });
      
      setUserRole('ADMIN'); // Default for now
      setSubscriptionPlan('FREE');
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const hasPermission = (requiredRole) => {
    const roleHierarchy = {
      'VIEWER': 0,
      'USER': 1,
      'MANAGER': 2,
      'ADMIN': 3
    };
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  };

  const canUpload = (fileSize) => {
    if (!currentCompany) return false;
    
    // Check storage limit
    if (currentCompany.storageUsed + fileSize > currentCompany.storageLimit) {
      return false;
    }
    
    // Check plan restrictions
    if (subscriptionPlan === 'FREE' && fileSize > 50 * 1024 * 1024) { // 50MB max for free
      return false;
    }
    
    return hasPermission('USER');
  };

  const updateStorageUsed = (additionalBytes) => {
    setCurrentCompany(prev => ({
      ...prev,
      storageUsed: prev.storageUsed + additionalBytes
    }));
    setStorageUsed(prev => prev + additionalBytes);
  };

  const value = {
    currentUser,
    currentCompany,
    userRole,
    subscriptionPlan,
    storageUsed,
    storageLimit,
    hasPermission,
    canUpload,
    updateStorageUsed,
    loadUserData
  };

  return (
    <SaaSContext.Provider value={value}>
      {children}
    </SaaSContext.Provider>
  );
};